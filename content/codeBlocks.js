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
