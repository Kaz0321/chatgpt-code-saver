function decorateCodeBlocks(root = document) {
  const pres = root.querySelectorAll("pre code");
  pres.forEach((code) => {
    const pre = code.closest("pre");
    if (!pre) return;
    if (pre.dataset.cgptCodeHelperApplied === "1") return;
    pre.dataset.cgptCodeHelperApplied = "1";

    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const applyBtn = document.createElement("button");
    applyBtn.textContent = "Apply to project";
    applyBtn.style.position = "absolute";
    applyBtn.style.top = "4px";
    applyBtn.style.right = "4px";
    applyBtn.style.fontSize = "11px";
    applyBtn.style.padding = "2px 6px";
    applyBtn.style.borderRadius = "4px";
    applyBtn.style.border = "1px solid rgba(255,255,255,0.4)";
    applyBtn.style.background = "rgba(15, 157, 88, 0.9)";
    applyBtn.style.color = "#fff";
    applyBtn.style.cursor = "pointer";
    applyBtn.style.zIndex = "1";

    applyBtn.addEventListener("click", () => {
      const text = code.innerText || "";
      const normalized = text.replace(/\r\n/g, "\n");
      const lines = normalized.split("\n");
      if (!lines.length) {
        alert("コードブロックが空です。");
        return;
      }
      const first = lines[0].trim();
      const m =
        first.match(/^\/\/\s*file:\s*(.+)$/i) ||
        first.match(/^#\s*file:\s*(.+)$/i);
      if (!m) {
        alert("1行目に '// file: パス' または '# file: パス' を含めてください。");
        return;
      }
      const filePath = m[1].trim();
      if (!filePath) {
        alert("file パスが空です。");
        return;
      }
      const content = lines.slice(1).join("\n");

      chrome.runtime.sendMessage(
        { type: "applyCodeBlock", filePath: filePath, content: content },
        (res) => {
          if (!res || !res.ok) {
            showToast(
              "保存に失敗しました: " +
                (res && res.error ? res.error : "unknown error"),
              "error"
            );
          } else {
            const original = applyBtn.textContent;
            applyBtn.textContent = "Saved!";
            setTimeout(() => {
              applyBtn.textContent = original;
            }, 1500);
            showToast(`保存しました: ${filePath}`, "success");
          }
        }
      );
    });

    wrapper.appendChild(applyBtn);
  });
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
