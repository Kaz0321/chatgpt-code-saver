function openChatLogModal() {
  if (document.getElementById("cgpt-helper-chatlog-modal")) return;
  if (typeof getChatLogEntries !== "function") {
    alert("チャットログ機能の初期化に失敗しました。");
    return;
  }

  const allEntries = getChatLogEntries();
  const userEntries = allEntries.filter((entry) => entry.role === "user");

  const overlay = document.createElement("div");
  overlay.id = "cgpt-helper-chatlog-modal";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0,0,0,0.6)";
  overlay.style.zIndex = "10000";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";

  const closeModal = () => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  };

  const dialog = document.createElement("div");
  dialog.style.background = "#202123";
  dialog.style.color = "#fff";
  dialog.style.borderRadius = "10px";
  dialog.style.padding = "16px";
  dialog.style.width = "80%";
  dialog.style.maxWidth = "900px";
  dialog.style.maxHeight = "80%";
  dialog.style.display = "flex";
  dialog.style.flexDirection = "column";
  dialog.style.gap = "10px";
  dialog.style.boxShadow = "0 10px 40px rgba(0,0,0,0.6)";

  const headerRow = document.createElement("div");
  headerRow.style.display = "flex";
  headerRow.style.justifyContent = "space-between";
  headerRow.style.alignItems = "center";

  const title = document.createElement("div");
  title.textContent = "チャットログ";
  title.style.fontWeight = "bold";
  title.style.fontSize = "16px";
  headerRow.appendChild(title);

  const headerButtons = document.createElement("div");
  headerButtons.style.display = "flex";
  headerButtons.style.gap = "8px";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "閉じる";
  closeBtn.style.fontSize = "12px";
  closeBtn.style.padding = "4px 8px";
  closeBtn.style.borderRadius = "4px";
  closeBtn.style.border = "1px solid rgba(255,255,255,0.3)";
  closeBtn.style.background = "#444";
  closeBtn.style.color = "#fff";
  closeBtn.style.cursor = "pointer";
  closeBtn.addEventListener("click", closeModal);
  headerButtons.appendChild(closeBtn);

  headerRow.appendChild(headerButtons);
  dialog.appendChild(headerRow);

  const list = document.createElement("div");
  list.style.flex = "1";
  list.style.overflow = "auto";
  list.style.display = "flex";
  list.style.flexDirection = "column";
  list.style.gap = "12px";

  if (userEntries.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "自分のチャット履歴がまだ見つかりません。";
    empty.style.color = "#9ca3af";
    list.appendChild(empty);
  } else {
    const orderedUsers = userEntries.sort((a, b) => a.order - b.order);
    orderedUsers.forEach((entry, index) => {
      const card = document.createElement("div");
      card.style.border = "1px solid #3f3f46";
      card.style.borderRadius = "8px";
      card.style.padding = "10px";
      card.style.background = "#18181b";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.gap = "6px";

      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.justifyContent = "space-between";
      header.style.alignItems = "center";
      header.style.gap = "8px";

      const info = document.createElement("div");
      info.style.flex = "1";
      info.style.fontSize = "12px";
      info.style.color = "#d1d5db";
      info.textContent = `${formatChatLogTimestamp(entry.timestamp)} に送信したメッセージ`;
      header.appendChild(info);

      const jumpBtn = document.createElement("button");
      jumpBtn.textContent = "ジャンプ";
      jumpBtn.style.fontSize = "11px";
      jumpBtn.style.padding = "3px 8px";
      jumpBtn.style.borderRadius = "4px";
      jumpBtn.style.border = "1px solid rgba(255,255,255,0.3)";
      jumpBtn.style.background = "rgba(59,130,246,0.2)";
      jumpBtn.style.color = "#bfdbfe";
      jumpBtn.style.cursor = "pointer";
      jumpBtn.addEventListener("click", () => {
        closeModal();
        if (typeof highlightChatMessageElement === "function") {
          highlightChatMessageElement(entry.element);
        } else if (entry.element && typeof entry.element.scrollIntoView === "function") {
          entry.element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
      header.appendChild(jumpBtn);

      card.appendChild(header);

      const messageBody = document.createElement("div");
      messageBody.style.whiteSpace = "pre-wrap";
      messageBody.style.fontSize = "13px";
      messageBody.style.lineHeight = "1.5";
      messageBody.style.color = "#f3f4f6";
      messageBody.textContent = entry.text || "(テキストなし)";
      card.appendChild(messageBody);

      const assistantBlocks = collectAssistantBlocksForEntry(entry, orderedUsers[index + 1], allEntries);
      if (assistantBlocks.length > 0) {
        const blockHeader = document.createElement("div");
        blockHeader.textContent = `対応するコードブロック (${assistantBlocks.length})`;
        blockHeader.style.fontSize = "12px";
        blockHeader.style.color = "#a5b4fc";
        card.appendChild(blockHeader);

        assistantBlocks.forEach((block) => {
          const blockWrapper = document.createElement("div");
          blockWrapper.style.border = "1px solid #27272a";
          blockWrapper.style.borderRadius = "6px";
          blockWrapper.style.background = "#111827";
          blockWrapper.style.padding = "6px";
          blockWrapper.style.display = "flex";
          blockWrapper.style.flexDirection = "column";
          blockWrapper.style.gap = "6px";

          const blockHeaderRow = document.createElement("div");
          blockHeaderRow.style.display = "flex";
          blockHeaderRow.style.justifyContent = "space-between";
          blockHeaderRow.style.alignItems = "center";
          blockHeaderRow.style.gap = "8px";

          const fileInfoWrapper = document.createElement("div");
          fileInfoWrapper.style.flex = "1";
          fileInfoWrapper.style.display = "flex";
          fileInfoWrapper.style.flexDirection = "column";
          fileInfoWrapper.style.gap = "2px";

          const fileNameLabel = document.createElement("div");
          fileNameLabel.textContent = block.fileName || block.filePath;
          fileNameLabel.style.fontSize = "12px";
          fileNameLabel.style.color = "#facc15";
          fileNameLabel.style.fontWeight = "bold";
          fileInfoWrapper.appendChild(fileNameLabel);

          const filePathLabel = document.createElement("div");
          filePathLabel.textContent = block.filePath;
          filePathLabel.style.fontSize = "11px";
          filePathLabel.style.color = "#fef3c7";
          filePathLabel.style.opacity = "0.9";
          fileInfoWrapper.appendChild(filePathLabel);

          blockHeaderRow.appendChild(fileInfoWrapper);

          const downloadBtn = document.createElement("button");
          downloadBtn.textContent = "ダウンロード";
          downloadBtn.style.fontSize = "11px";
          downloadBtn.style.padding = "2px 8px";
          downloadBtn.style.borderRadius = "4px";
          downloadBtn.style.border = "1px solid rgba(255,255,255,0.3)";
          downloadBtn.style.background = "rgba(16,185,129,0.2)";
          downloadBtn.style.color = "#6ee7b7";
          downloadBtn.style.cursor = "pointer";
          downloadBtn.addEventListener("click", () => {
            downloadBtn.disabled = true;
            triggerChatLogDownload(block.filePath, block.content, () => {
              downloadBtn.disabled = false;
            });
          });
          blockHeaderRow.appendChild(downloadBtn);

          blockWrapper.appendChild(blockHeaderRow);

          const codePre = document.createElement("pre");
          codePre.style.margin = "0";
          codePre.style.fontSize = "12px";
          codePre.style.whiteSpace = "pre-wrap";
          codePre.style.background = "#030712";
          codePre.style.padding = "8px";
          codePre.style.borderRadius = "4px";
          codePre.style.overflowX = "auto";
          codePre.textContent = block.content;
          blockWrapper.appendChild(codePre);

          card.appendChild(blockWrapper);
        });
      }

      const assistantUrls = collectAssistantUrlsForEntry(
        entry,
        orderedUsers[index + 1],
        allEntries
      );
      if (assistantUrls.length > 0) {
        const urlHeader = document.createElement("div");
        urlHeader.textContent = `提供されたリンク (${assistantUrls.length})`;
        urlHeader.style.fontSize = "12px";
        urlHeader.style.color = "#7dd3fc";
        card.appendChild(urlHeader);

        assistantUrls.forEach((link) => {
          const urlWrapper = document.createElement("div");
          urlWrapper.style.border = "1px solid #1f2937";
          urlWrapper.style.borderRadius = "6px";
          urlWrapper.style.background = "#0f172a";
          urlWrapper.style.padding = "6px";
          urlWrapper.style.display = "flex";
          urlWrapper.style.flexDirection = "column";
          urlWrapper.style.gap = "6px";

          const urlHeaderRow = document.createElement("div");
          urlHeaderRow.style.display = "flex";
          urlHeaderRow.style.justifyContent = "space-between";
          urlHeaderRow.style.alignItems = "center";
          urlHeaderRow.style.gap = "8px";

          const urlLabelWrapper = document.createElement("div");
          urlLabelWrapper.style.flex = "1";
          urlLabelWrapper.style.display = "flex";
          urlLabelWrapper.style.flexDirection = "column";
          urlLabelWrapper.style.gap = "2px";

          const urlDisplayText = document.createElement("div");
          urlDisplayText.textContent = link.text || link.url;
          urlDisplayText.style.fontSize = "12px";
          urlDisplayText.style.color = "#bae6fd";
          urlDisplayText.style.fontWeight = "bold";
          urlLabelWrapper.appendChild(urlDisplayText);

          const urlValue = document.createElement("div");
          urlValue.textContent = link.url;
          urlValue.style.fontSize = "11px";
          urlValue.style.color = "#e0f2fe";
          urlValue.style.opacity = "0.9";
          urlLabelWrapper.appendChild(urlValue);

          urlHeaderRow.appendChild(urlLabelWrapper);

          const openBtn = document.createElement("button");
          openBtn.textContent = "リンクを開く";
          openBtn.style.fontSize = "11px";
          openBtn.style.padding = "2px 8px";
          openBtn.style.borderRadius = "4px";
          openBtn.style.border = "1px solid rgba(255,255,255,0.3)";
          openBtn.style.background = "rgba(59,130,246,0.2)";
          openBtn.style.color = "#bfdbfe";
          openBtn.style.cursor = "pointer";
          openBtn.addEventListener("click", () => {
            window.open(link.url, "_blank", "noopener,noreferrer");
          });
          urlHeaderRow.appendChild(openBtn);

          urlWrapper.appendChild(urlHeaderRow);
          card.appendChild(urlWrapper);
        });
      }

      list.appendChild(card);
    });
  }

  dialog.appendChild(list);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  });
}

function formatChatLogTimestamp(ts) {
  const date = new Date(ts);
  if (!isNaN(date.getTime())) {
    return date.toLocaleString();
  }
  return ts || "";
}

function collectAssistantBlocksForEntry(entry, nextEntry, allEntries) {
  const blocks = [];
  const startOrder = entry.order;
  const endOrder = nextEntry ? nextEntry.order : Infinity;
  allEntries
    .filter((e) => e.role === "assistant" && e.order > startOrder && e.order < endOrder)
    .forEach((assistantEntry) => {
      if (!assistantEntry.element) return;
      extractFormattedCodeBlocksFromElement(assistantEntry.element).forEach((block) => {
        blocks.push(block);
      });
    });
  return blocks;
}

function collectAssistantUrlsForEntry(entry, nextEntry, allEntries) {
  const urls = [];
  const seen = new Set();
  const startOrder = entry.order;
  const endOrder = nextEntry ? nextEntry.order : Infinity;
  allEntries
    .filter((e) => e.role === "assistant" && e.order > startOrder && e.order < endOrder)
    .forEach((assistantEntry) => {
      if (!assistantEntry.element) return;
      extractStandaloneUrlsFromElement(assistantEntry.element).forEach((link) => {
        const key = `${link.url}|${link.text}`;
        if (seen.has(key)) return;
        seen.add(key);
        urls.push(link);
      });
    });
  return urls;
}

function extractFormattedCodeBlocksFromElement(element) {
  const results = [];
  if (!element) return results;
  element.querySelectorAll("pre code").forEach((codeEl) => {
    const rawText = codeEl.textContent || "";
    const normalized = rawText.replace(/\r\n/g, "\n");
    const lines = normalized.split("\n");
    if (!lines.length) return;
    const firstLine = lines[0].trim();
    const match =
      firstLine.match(/^\/\/\s*file:\s*(.+)$/i) || firstLine.match(/^#\s*file:\s*(.+)$/i);
    if (!match) return;
    const filePath = match[1].trim();
    if (!filePath) return;
    const content = lines.slice(1).join("\n");
    results.push({ filePath, fileName: deriveFileName(filePath), content });
  });
  return results;
}

function extractStandaloneUrlsFromElement(element) {
  const results = [];
  if (!element) return results;
  const anchors = element.querySelectorAll("a[href]");
  anchors.forEach((anchor) => {
    if (anchor.closest("pre")) return;
    const href = anchor.getAttribute("href") || "";
    if (!/^https?:\/\//i.test(href)) return;
    const text = (anchor.textContent || "").trim();
    results.push({ url: href, text });
  });
  return results;
}

function deriveFileName(filePath) {
  if (!filePath) return "";
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || filePath;
}

function triggerChatLogDownload(filePath, content, onDone) {
  const callback = typeof onDone === "function" ? onDone : () => {};
  chrome.runtime.sendMessage(
    { type: "applyCodeBlock", filePath, content },
    (res) => {
      callback();
      if (!res || !res.ok) {
        const errMsg = (res && res.error) || "ダウンロードに失敗しました";
        if (typeof showToast === "function") {
          showToast(errMsg, "error");
        } else {
          alert(errMsg);
        }
      } else if (typeof showToast === "function") {
        showToast(`ダウンロードを開始しました: ${filePath}`, "success");
      }
    }
  );
}
