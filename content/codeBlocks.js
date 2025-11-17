const CODE_COLLAPSE_LINE_THRESHOLD = 30;
const CODE_COLLAPSED_MAX_HEIGHT_PX = 320;

function decorateCodeBlocks(root = document) {
  const pres = root.querySelectorAll("pre code");
  pres.forEach((code) => {
    const pre = code.closest("pre");
    if (!pre) return;
    if (pre.dataset.cgptCodeHelperApplied === "1") return;

    const parsed = parseCodeBlockMetadata(code);
    if (!parsed) return;

    const wrapper = wrapPreWithRelativeContainer(pre);
    pre.dataset.cgptCodeHelperApplied = "1";

    const saveBtn = createSaveButtonElement();
    saveBtn.addEventListener("click", () => {
      handleSaveButtonClick(saveBtn, code);
    });

    wrapper.appendChild(saveBtn);

    applyCollapsibleFeature(pre, code, wrapper);
  });
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

function createSaveButtonElement() {
  const button = document.createElement("button");
  button.textContent = "Save";
  button.style.position = "absolute";
  button.style.top = "8px";
  button.style.right = "52px";
  button.style.fontSize = "11px";
  button.style.padding = "2px 10px";
  button.style.borderRadius = "4px";
  button.style.border = "1px solid rgba(255,255,255,0.4)";
  button.style.background = "rgba(15, 157, 88, 0.95)";
  button.style.color = "#fff";
  button.style.cursor = "pointer";
  button.style.zIndex = "2";
  button.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
  button.title = "コードを保存";
  return button;
}

function createCollapseToggleButton() {
  const button = document.createElement("button");
  button.style.position = "absolute";
  button.style.top = "8px";
  button.style.right = "8px";
  button.style.fontSize = "11px";
  button.style.padding = "2px 10px";
  button.style.borderRadius = "4px";
  button.style.border = "1px solid rgba(255,255,255,0.4)";
  button.style.background = "rgba(66, 133, 244, 0.95)";
  button.style.color = "#fff";
  button.style.cursor = "pointer";
  button.style.zIndex = "2";
  button.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
  return button;
}

function handleSaveButtonClick(button, code) {
  const parsed = parseCodeBlockMetadata(code);
  if (!parsed) {
    alert("1行目に '// file: パス' または '# file: パス' を含めてください。");
    return;
  }

  const { filePath, content } = parsed;
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

      const original = button.textContent;
      button.textContent = "Saved!";
      setTimeout(() => {
        button.textContent = original;
      }, 1500);
      if (typeof showToast === "function") {
        showToast(`保存しました: ${filePath}`, "success");
      }
    }
  );
}

function applyCollapsibleFeature(pre, code, wrapper) {
  if (!shouldCollapseCodeBlock(code)) return;
  if (pre.dataset.cgptCollapsibleApplied === "1") return;

  rememberOriginalPreStyles(pre);
  const toggleButton = createCollapseToggleButton();
  const updateLabel = () => {
    toggleButton.textContent = isPreCollapsed(pre) ? "展開" : "折りたたみ";
    toggleButton.title = isPreCollapsed(pre)
      ? "コードブロックを展開"
      : "コードブロックを折りたたみ";
  };

  toggleButton.addEventListener("click", () => {
    const collapsed = isPreCollapsed(pre);
    setPreCollapsed(pre, !collapsed);
    updateLabel();
  });

  setPreCollapsed(pre, true);
  updateLabel();
  wrapper.appendChild(toggleButton);
  pre.dataset.cgptCollapsibleApplied = "1";
}

function shouldCollapseCodeBlock(code) {
  const lines = getCodeLineCount(code);
  return lines > CODE_COLLAPSE_LINE_THRESHOLD;
}

function getCodeLineCount(code) {
  const text = (code && code.innerText) || "";
  if (!text) return 0;
  return text.replace(/\r\n/g, "\n").split("\n").length;
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
      if (m.addedNodes && m.addedNodes.length > 0) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            decorateCodeBlocks(node);
            if (typeof captureChatLogsFromNode === "function") {
              captureChatLogsFromNode(node);
            }
          } else if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            if (typeof captureChatLogsFromNode === "function") {
              captureChatLogsFromNode(node);
            }
          }
        });
      }
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
