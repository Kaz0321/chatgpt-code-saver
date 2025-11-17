const CODE_COLLAPSED_MAX_HEIGHT_PX = 320;
const BUTTON_FEEDBACK_TIMEOUT_MS = 1500;

function decorateCodeBlocks(root = document) {
  if (!root || typeof root.querySelectorAll !== "function") return;
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

  const collapseBtn = createCollapseButtonElement();
  const expandBtn = createExpandButtonElement();
  collapseBtn.addEventListener("click", () => {
    handleCollapseButtonClick(pre, collapseBtn, expandBtn);
  });
  expandBtn.addEventListener("click", () => {
    handleExpandButtonClick(pre, collapseBtn, expandBtn);
  });
  buttonContainer.appendChild(collapseBtn);
  buttonContainer.appendChild(expandBtn);

  wrapper.appendChild(buttonContainer);

  ensureCollapsibleState(pre);
  updateCollapseButtonStates(pre, collapseBtn, expandBtn);
}

function parseCodeBlockMetadata(code) {
  if (!code) return null;
  const text = code.innerText || "";
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  if (!lines.length) return null;
  const first = lines[0].trim();
  const match =
    first.match(/^\/\/\s*file:\s*(.+)$/i) || first.match(/^#\s*file:\s*(.+)$/i);
  if (!match) return null;
  const filePath = match[1].trim();
  if (!filePath) return null;
  const content = lines.slice(1).join("\n");
  return { filePath, content };
}

function wrapPreWithRelativeContainer(pre) {
  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  if (pre.parentNode) {
    pre.parentNode.insertBefore(wrapper, pre);
  }
  wrapper.appendChild(pre);
  return wrapper;
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
  button.textContent = hasMetadata ? "Save" : "Save...";
  button.title = hasMetadata
    ? "コードを保存"
    : "保存先のファイル名を指定してコードを保存";
  applyButtonVariant(button, hasMetadata ? "primary" : "warning");
  return button;
}

function createCopyButtonElement() {
  const button = createBaseButtonElement("overlay");
  button.textContent = "Copy";
  button.title = "コードをコピー";
  applyButtonVariant(button, "neutral");
  return button;
}

function createCollapseButtonElement() {
  const button = createBaseButtonElement("overlay");
  button.textContent = "折りたたみ";
  button.title = "コードブロックを折りたたみ";
  applyButtonVariant(button, "accent");
  return button;
}

function createExpandButtonElement() {
  const button = createBaseButtonElement("overlay");
  button.textContent = "展開";
  button.title = "コードブロックを展開";
  applyButtonVariant(button, "accent");
  return button;
}

function applyButtonVariant(button, variant) {
  const palette = {
    primary: "rgba(15, 157, 88, 0.95)",
    warning: "rgba(202, 138, 4, 0.95)",
    neutral: "rgba(55, 65, 81, 0.9)",
    accent: "rgba(66, 133, 244, 0.95)",
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

      flashButtonText(button, "Saved!");
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
    flashButtonText(button, "Copied!");
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

function handleCollapseButtonClick(pre, collapseBtn, expandBtn) {
  if (!ensureCollapsibleState(pre)) return;
  setPreCollapsed(pre, true);
  updateCollapseButtonStates(pre, collapseBtn, expandBtn);
}

function handleExpandButtonClick(pre, collapseBtn, expandBtn) {
  if (!ensureCollapsibleState(pre)) return;
  setPreCollapsed(pre, false);
  updateCollapseButtonStates(pre, collapseBtn, expandBtn);
}

function updateCollapseButtonStates(pre, collapseBtn, expandBtn) {
  const collapsible = pre.dataset.cgptCollapsibleApplied === "1";
  if (!collapseBtn || !expandBtn) return;
  if (!collapsible) {
    collapseBtn.disabled = true;
    expandBtn.disabled = true;
    collapseBtn.title = "折りたたみ対象ではありません";
    expandBtn.title = "折りたたみ対象ではありません";
    return;
  }
  const collapsed = isPreCollapsed(pre);
  collapseBtn.disabled = collapsed;
  expandBtn.disabled = !collapsed;
}

function ensureCollapsibleState(pre) {
  if (!pre) return false;
  if (pre.dataset.cgptCollapsibleApplied !== "1") {
    rememberOriginalPreStyles(pre);
    setPreCollapsed(pre, false);
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
  if (pre.dataset.cgptOriginalOverflow === undefined) {
    pre.dataset.cgptOriginalOverflow = pre.style.overflow || "";
  }
  if (pre.dataset.cgptOriginalMaxHeight === undefined) {
    pre.dataset.cgptOriginalMaxHeight = pre.style.maxHeight || "";
  }
}

function isPreCollapsed(pre) {
  return pre.dataset.cgptCollapsed === "1";
}

function setPreCollapsed(pre, collapsed) {
  pre.dataset.cgptCollapsed = collapsed ? "1" : "0";
  if (collapsed) {
    pre.style.maxHeight = `${CODE_COLLAPSED_MAX_HEIGHT_PX}px`;
    pre.style.overflow = "hidden";
  } else {
    pre.style.maxHeight = pre.dataset.cgptOriginalMaxHeight || "";
    pre.style.overflow = pre.dataset.cgptOriginalOverflow || "";
  }
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
