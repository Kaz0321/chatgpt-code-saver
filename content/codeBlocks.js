const BUTTON_FEEDBACK_TIMEOUT_MS = 1500;
const CGPT_CODE_WRAPPER_CLASS = "cgpt-code-wrapper";
const CGPT_CODE_COLLAPSED_CLASS = "cgpt-code-wrapper--collapsed";
let cgptCodeBlockStylesInjected = false;
const FALLBACK_VIEW_SETTINGS = {
  compactLineCount: 1,
  collapsedLineCount: 12,
};
const CGPT_VIEW_MODE = {
  COMPACT: "compact",
  COLLAPSED: "collapsed",
  EXPANDED: "expanded",
};

function decorateCodeBlocks(root = document) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  ensureCodeBlockStyles();
  const pres = root.querySelectorAll("pre code");
  pres.forEach((code) => {
    tryDecorateSingleCodeBlock(code);
  });
}

function tryDecorateSingleCodeBlock(code) {
  if (!code) return;
  const pre = code.closest("pre");
  if (!pre) return;
  if (pre.dataset.cgptCodeHelperApplied === "1") return;

  const metadata = parseCodeBlockMetadata(code);
  const wrapper = wrapPreWithRelativeContainer(pre);
  pre.dataset.cgptCodeHelperApplied = "1";

  const buttonContainer = createButtonContainer();

  const saveBtn = createSaveButtonElement(Boolean(metadata));
  saveBtn.addEventListener("click", () => {
    handleSaveButtonClick(saveBtn, code);
  });
  buttonContainer.appendChild(saveBtn);

  const copyBtn = createCopyButtonElement();
  copyBtn.addEventListener("click", () => {
    handleCopyButtonClick(copyBtn, code);
  });
  buttonContainer.appendChild(copyBtn);

  const shrinkBtn = createShrinkButtonElement();
  const collapseBtn = createCollapseButtonElement();
  const expandBtn = createExpandButtonElement();
  shrinkBtn.addEventListener("click", () => {
    handleShrinkButtonClick(pre);
  });
  collapseBtn.addEventListener("click", () => {
    handleCollapseButtonClick(pre);
  });
  expandBtn.addEventListener("click", () => {
    handleExpandButtonClick(pre);
  });
  buttonContainer.appendChild(shrinkBtn);
  buttonContainer.appendChild(collapseBtn);
  buttonContainer.appendChild(expandBtn);

  wrapper.appendChild(buttonContainer);

  ensureCollapsibleState(pre);
  pre.cgptViewButtons = { shrinkBtn, collapseBtn, expandBtn };
  setPreViewMode(pre, CGPT_VIEW_MODE.COMPACT);
}

function parseCodeBlockMetadata(code) {
  if (!code) return null;
  const text = code.innerText || "";
  const normalized = text.replace(/^\ufeff/, "").replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  if (!lines.length) return null;

  let metadataLineIndex = -1;
  let filePath = "";

  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].replace(/^\ufeff/, "").trim();
    if (!trimmedLine) {
      continue;
    }
    const match =
      trimmedLine.match(/^\/\/\s*file:\s*(.+)$/i) ||
      trimmedLine.match(/^#\s*file:\s*(.+)$/i);
    if (!match) {
      break;
    }
    filePath = match[1].trim();
    if (!filePath) {
      break;
    }
    metadataLineIndex = i;
    break;
  }

  if (metadataLineIndex === -1 || !filePath) return null;

  const content = lines.slice(metadataLineIndex + 1).join("\n");
  return { filePath, content };
}

function wrapPreWithRelativeContainer(pre) {
  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  wrapper.dataset.cgptCodeWrapper = "1";
  wrapper.classList.add(CGPT_CODE_WRAPPER_CLASS);
  if (pre.parentNode) {
    pre.parentNode.insertBefore(wrapper, pre);
  }
  wrapper.appendChild(pre);
  return wrapper;
}

function getCollapsibleElement(pre) {
  if (!pre) return null;
  const parent = pre.parentElement;
  if (parent && parent.dataset.cgptCodeWrapper === "1") {
    return parent;
  }
  return pre;
}

function createButtonContainer(placement = "overlay") {
  const container = document.createElement("div");
  container.style.display = "inline-flex";
  container.style.gap = "6px";
  container.style.alignItems = "center";
  container.style.position = "absolute";
  container.style.top = "8px";
  container.style.right = "16px";
  container.style.zIndex = "2";
  container.style.display = "flex";
  return container;
}

function createBaseButtonElement(placement = "overlay") {
  const button = document.createElement("button");
  button.style.fontSize = "11px";
  button.style.padding = "2px 10px";
  button.style.borderRadius = "4px";
  button.style.border = "1px solid rgba(255,255,255,0.4)";
  button.style.cursor = "pointer";
  button.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
  button.style.transition = "opacity 0.2s ease";
  button.style.position = placement === "toolbar" ? "relative" : "relative";
  button.style.zIndex = placement === "toolbar" ? "1" : "2";
  return button;
}

function createSaveButtonElement(hasMetadata = true) {
  const button = createBaseButtonElement("overlay");
  button.textContent = hasMetadata ? "保存" : "保存(指定)";
  button.title = hasMetadata
    ? "コードを保存"
    : "保存先のファイル名を指定してコードを保存";
  applyButtonVariant(button, hasMetadata ? "primary" : "warning");
  return button;
}

function createCopyButtonElement() {
  const button = createBaseButtonElement("overlay");
  button.textContent = "コピー";
  button.title = "コードをコピー";
  applyButtonVariant(button, "neutral");
  return button;
}

function createShrinkButtonElement() {
  const button = createBaseButtonElement("overlay");
  button.textContent = "縮小";
  button.title = "1行表示に縮小";
  applyButtonVariant(button, "muted");
  return button;
}

function createCollapseButtonElement() {
  const button = createBaseButtonElement("overlay");
  button.textContent = "折りたたみ";
  button.title = "設定行数で折りたたみ";
  applyButtonVariant(button, "accent");
  return button;
}

function createExpandButtonElement() {
  const button = createBaseButtonElement("overlay");
  button.textContent = "展開";
  button.title = "全行を展開";
  applyButtonVariant(button, "accent");
  return button;
}

function applyButtonVariant(button, variant) {
  const palette = {
    primary: "rgba(16, 185, 129, 0.95)",
    warning: "rgba(251, 191, 36, 0.95)",
    neutral: "rgba(55, 65, 81, 0.9)",
    muted: "rgba(75, 85, 99, 0.9)",
    accent: "rgba(59, 130, 246, 0.95)",
  };
  const color = palette[variant] || palette.neutral;
  button.style.background = color;
  button.style.color = "#fff";
}

function handleSaveButtonClick(button, code) {
  const parsed = parseCodeBlockMetadata(code);
  if (!parsed) {
    const userInput = prompt("保存するファイル名（パス）を入力してください", "");
    if (!userInput) {
      return;
    }
    const filePath = userInput.trim();
    if (!filePath) {
      return;
    }
    const content = getNormalizedCodeText(code);
    triggerApplyCode(button, filePath, content);
    return;
  }

  const { filePath, content } = parsed;
  triggerApplyCode(button, filePath, content);
}

function triggerApplyCode(button, filePath, content) {
  if (!filePath) return;
  chrome.runtime.sendMessage(
    { type: "applyCodeBlock", filePath, content },
    (res) => {
      if (!res || !res.ok) {
        const errorMessage =
          "保存に失敗しました: " + (res && res.error ? res.error : "unknown error");
        if (typeof showToast === "function") {
          showToast(errorMessage, "error");
        } else {
          alert(errorMessage);
        }
        return;
      }

      flashButtonText(button, "保存済");
      if (typeof showToast === "function") {
        showToast(`保存しました: ${filePath}`, "success");
      }
    }
  );
}

function handleCopyButtonClick(button, code) {
  const parsed = parseCodeBlockMetadata(code);
  const textToCopy = parsed && parsed.content ? parsed.content : getNormalizedCodeText(code);
  if (!textToCopy) return;

  const onSuccess = () => {
    flashButtonText(button, "コピー済");
    if (typeof showToast === "function") {
      showToast("コードをコピーしました", "success");
    }
  };
  const onFailure = () => {
    if (typeof showToast === "function") {
      showToast("コピーに失敗しました", "error");
    }
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textToCopy).then(onSuccess).catch(onFailure);
    return;
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = textToCopy;
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (ok) {
      onSuccess();
    } else {
      onFailure();
    }
  } catch (error) {
    onFailure();
  }
}

function flashButtonText(button, text) {
  if (!button) return;
  const original = button.textContent;
  button.textContent = text;
  setTimeout(() => {
    button.textContent = original;
  }, BUTTON_FEEDBACK_TIMEOUT_MS);
}

function handleShrinkButtonClick(pre) {
  setPreViewMode(pre, CGPT_VIEW_MODE.COMPACT);
}

function handleCollapseButtonClick(pre) {
  setPreViewMode(pre, CGPT_VIEW_MODE.COLLAPSED);
}

function handleExpandButtonClick(pre) {
  setPreViewMode(pre, CGPT_VIEW_MODE.EXPANDED);
}

function updateViewButtonStates(pre) {
  const buttons = pre && pre.cgptViewButtons;
  if (!buttons) return;
  const mode = getPreViewMode(pre);
  const disabledStates = {
    shrinkBtn: mode === CGPT_VIEW_MODE.COMPACT,
    collapseBtn: mode === CGPT_VIEW_MODE.COLLAPSED,
    expandBtn: mode === CGPT_VIEW_MODE.EXPANDED,
  };
  Object.keys(buttons).forEach((key) => {
    const btn = buttons[key];
    if (btn) {
      btn.disabled = Boolean(disabledStates[key]);
    }
  });
}

function ensureCollapsibleState(pre) {
  if (!pre) return false;
  if (pre.dataset.cgptCollapsibleApplied !== "1") {
    rememberOriginalPreStyles(pre);
    pre.dataset.cgptCollapsibleApplied = "1";
  }
  return true;
}

function getNormalizedCodeText(code) {
  if (!code) return "";
  const text = code.innerText || code.textContent || "";
  return text.replace(/\r\n/g, "\n");
}

function rememberOriginalPreStyles(pre) {
  const collapsibleEl = getCollapsibleElement(pre);
  if (!collapsibleEl) return;
  if (pre.dataset.cgptOriginalOverflow === undefined) {
    pre.dataset.cgptOriginalOverflow = collapsibleEl.style.overflow || "";
  }
  if (pre.dataset.cgptOriginalMaxHeight === undefined) {
    pre.dataset.cgptOriginalMaxHeight = collapsibleEl.style.maxHeight || "";
  }
}

function getPreViewMode(pre) {
  if (!pre) return CGPT_VIEW_MODE.EXPANDED;
  return pre.dataset.cgptViewMode || CGPT_VIEW_MODE.EXPANDED;
}

function setPreViewMode(pre, mode) {
  if (!pre || !ensureCollapsibleState(pre)) return;
  const collapsibleEl = getCollapsibleElement(pre);
  if (!collapsibleEl) return;
  const viewSettings =
    typeof cgptGetViewSettings === "function"
      ? cgptGetViewSettings()
      : FALLBACK_VIEW_SETTINGS;
  pre.dataset.cgptViewMode = mode;
  if (mode === CGPT_VIEW_MODE.EXPANDED) {
    collapsibleEl.style.maxHeight = pre.dataset.cgptOriginalMaxHeight || "";
    collapsibleEl.style.overflow = pre.dataset.cgptOriginalOverflow || "";
    setCollapsedVisualState(collapsibleEl, false);
  } else {
    const lineCount =
      mode === CGPT_VIEW_MODE.COMPACT
        ? viewSettings.compactLineCount
        : viewSettings.collapsedLineCount;
    const normalizedLines = Math.max(1, Number(lineCount) || 1);
    const lineHeight = getCodeLineHeight(pre);
    const targetHeight = normalizedLines * lineHeight;
    collapsibleEl.style.maxHeight = `${targetHeight}px`;
    collapsibleEl.style.overflow = "hidden";
    setCollapsedVisualState(collapsibleEl, true);
  }
  updateViewButtonStates(pre);
}

function getCodeLineHeight(pre) {
  const code = pre.querySelector("code") || pre;
  const style = window.getComputedStyle ? window.getComputedStyle(code) : null;
  if (!style) {
    return 18;
  }
  let lineHeight = parseFloat(style.lineHeight);
  if (!Number.isFinite(lineHeight)) {
    const fontSize = parseFloat(style.fontSize) || 14;
    lineHeight = fontSize * 1.4;
  }
  return lineHeight || 18;
}

function getDecoratedPreElements() {
  return Array.from(document.querySelectorAll("pre[data-cgpt-code-helper-applied='1']"));
}

function cgptApplyViewModeToAll(mode) {
  getDecoratedPreElements().forEach((pre) => {
    setPreViewMode(pre, mode);
  });
}

function cgptReapplyViewMode(mode) {
  getDecoratedPreElements().forEach((pre) => {
    if (getPreViewMode(pre) === mode) {
      setPreViewMode(pre, mode);
    }
  });
}

function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "childList" && m.addedNodes && m.addedNodes.length > 0) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.DOCUMENT_NODE) {
            decorateCodeBlocks(node);
            if (typeof captureChatLogsFromNode === "function") {
              captureChatLogsFromNode(node);
            }
          } else if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            decorateCodeBlocks(node);
            if (typeof captureChatLogsFromNode === "function") {
              captureChatLogsFromNode(node);
            }
          } else if (node.nodeType === Node.TEXT_NODE) {
            tryDecorateFromTextNode(node);
          }
        });
      } else if (m.type === "characterData") {
        tryDecorateFromTextNode(m.target);
      }
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

function tryDecorateFromTextNode(node) {
  if (!node || node.nodeType !== Node.TEXT_NODE) return;
  const elementParent = node.parentElement;
  if (!elementParent) return;
  const code = elementParent.closest("code");
  if (!code) return;
  tryDecorateSingleCodeBlock(code);
}

function setCollapsedVisualState(element, isCollapsed) {
  if (!element || !element.classList) return;
  element.classList.add(CGPT_CODE_WRAPPER_CLASS);
  element.classList.toggle(CGPT_CODE_COLLAPSED_CLASS, Boolean(isCollapsed));
}

function ensureCodeBlockStyles() {
  if (cgptCodeBlockStylesInjected) return;
  const style = document.createElement("style");
  style.dataset.cgptCodeStyles = "1";
  style.textContent = `
.${CGPT_CODE_WRAPPER_CLASS} {
  position: relative;
}
.${CGPT_CODE_WRAPPER_CLASS}.${CGPT_CODE_COLLAPSED_CLASS}::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 48px;
  background: linear-gradient(180deg, rgba(32, 33, 35, 0) 0%, rgba(32, 33, 35, 0.85) 100%);
  pointer-events: none;
}
.${CGPT_CODE_WRAPPER_CLASS}.${CGPT_CODE_COLLAPSED_CLASS}::after {
  content: "…";
  position: absolute;
  right: 12px;
  bottom: 8px;
  font-size: 20px;
  line-height: 1;
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
  pointer-events: none;
}
`;
  (document.head || document.documentElement).appendChild(style);
  cgptCodeBlockStylesInjected = true;
}
