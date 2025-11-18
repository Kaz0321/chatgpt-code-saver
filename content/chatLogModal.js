const CHAT_LOG_PREVIEW_LINE_LIMIT = 1;

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
  title.textContent = "Chat Log";
  title.style.fontWeight = "bold";
  title.style.fontSize = "16px";
  headerRow.appendChild(title);

  const headerButtons = document.createElement("div");
  headerButtons.style.display = "flex";
  headerButtons.style.gap = "8px";

  const closeBtn = createChatLogButton("Close", "muted");
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
    empty.textContent = "No user messages found.";
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
      info.textContent = `Sent ${formatChatLogTimestamp(entry.timestamp)}`;
      header.appendChild(info);

      const jumpBtn = createChatLogButton("Jump", "accent", "sm");
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
      const messageText = entry.text || "(no text)";
      messageBody.textContent = createSingleLinePreview(
        messageText,
        CHAT_LOG_PREVIEW_LINE_LIMIT
      );
      card.appendChild(messageBody);

      const assistantBlocks = collectAssistantBlocksForEntry(entry, orderedUsers[index + 1], allEntries);
      if (assistantBlocks.length > 0) {
        const blockHeader = document.createElement("div");
        blockHeader.style.display = "flex";
        blockHeader.style.alignItems = "center";
        blockHeader.style.justifyContent = "space-between";
        blockHeader.style.gap = "8px";

        const blockHeaderLabel = document.createElement("div");
        blockHeaderLabel.textContent = `Code blocks (${assistantBlocks.length})`;
        blockHeaderLabel.style.fontSize = "12px";
        blockHeaderLabel.style.color = "#a5b4fc";
        blockHeader.appendChild(blockHeaderLabel);

        const blockHeaderActions = document.createElement("div");
        blockHeaderActions.style.display = "flex";
        blockHeaderActions.style.gap = "6px";

        const batchSaveBtn = createBatchSaveAllButton(assistantBlocks);
        blockHeaderActions.appendChild(batchSaveBtn);

        const batchSaveAsBtn = createBatchSaveAsAllButton(assistantBlocks);
        blockHeaderActions.appendChild(batchSaveAsBtn);

        blockHeader.appendChild(blockHeaderActions);
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

          const blockActionWrapper = document.createElement("div");
          blockActionWrapper.style.display = "flex";
          blockActionWrapper.style.gap = "6px";
          blockActionWrapper.style.flexWrap = "wrap";

          const saveBtn = createBlockSaveButton(block);
          blockActionWrapper.appendChild(saveBtn);

          const saveAsBtn = createBlockSaveAsButton(block);
          blockActionWrapper.appendChild(saveAsBtn);

          const jumpBtn = createChatLogButton("Jump", "accent", "sm");
          jumpBtn.addEventListener("click", () => {
            closeModal();
            cgptJumpToCodeBlock(block.element);
          });
          blockActionWrapper.appendChild(jumpBtn);

          blockHeaderRow.appendChild(blockActionWrapper);

          blockWrapper.appendChild(blockHeaderRow);

          const blockMeta = createCodeMetaInfoElement(block);
          blockWrapper.appendChild(blockMeta);

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
        urlHeader.textContent = `Links Provided (${assistantUrls.length})`;
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

          const openBtn = createChatLogButton("Open Link", "accent", "sm");
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

function createSingleLinePreview(text, lineLimit = 1) {
  if (!text) return "";
  if (!lineLimit || lineLimit <= 0) return text;
  const normalized = normalizeLineEndings(text);
  const lines = normalized.split("\n");
  const firstLine = lines[0] || "";
  const hasMore = lines.length > lineLimit;
  return hasMore ? `${firstLine.trimEnd()}...` : firstLine;
}

function normalizeLineEndings(text) {
  return String(text).replace(/\r\n/g, "\n");
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
    const blockElement = codeEl.closest("pre") || codeEl;
    results.push({ filePath, fileName: deriveFileName(filePath), content, element: blockElement });
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

function triggerChatLogDownload(filePath, content, options = {}) {
  const { onDone, saveAs = false, overrideFolderPath = "" } = options || {};
  const callback = typeof onDone === "function" ? onDone : () => {};
  chrome.runtime.sendMessage(
    { type: "applyCodeBlock", filePath, content, saveAs, overrideFolderPath },
    (res) => {
      callback();
      if (!res || !res.ok) {
        const errMsg = (res && res.error) || "Failed to download";
        if (typeof showToast === "function") {
          showToast(errMsg, "error");
        } else {
          alert(errMsg);
        }
      } else if (typeof showToast === "function") {
        showToast(`Started download: ${filePath}`, "success");
      }
    }
  );
}

function createBatchSaveAllButton(blocks) {
  return createBatchSaveButton(blocks, {
    label: "Save All",
    pendingLabel: "Saving...",
  });
}

function createBatchSaveAsAllButton(blocks) {
  const button = createChatLogButton("Save As All", "secondary", "sm");
  setChatLogButtonDisabled(button, !blocks || !blocks.length);
  if (!blocks || !blocks.length) {
    return button;
  }
  button.addEventListener("click", () => {
    if (button.disabled) return;
    handleBatchSaveAsAll(button, blocks);
  });
  return button;
}

function createBatchSaveButton(blocks, options = {}) {
  const { label = "Save All", variant = "success", pendingLabel = "Saving..." } = options;
  const button = createChatLogButton(label, variant, "sm");
  setChatLogButtonDisabled(button, !blocks || !blocks.length);

  if (!blocks || !blocks.length) {
    return button;
  }

  button.addEventListener("click", async () => {
    if (button.disabled) return;
    await handleBatchSave(button, blocks, { pendingLabel });
  });

  return button;
}

async function handleBatchSave(button, blocks, options = {}) {
  const originalText = button.textContent;
  setChatLogButtonDisabled(button, true);
  button.textContent = options.pendingLabel || "Saving...";
  try {
    await downloadCodeBlocksSequentially(blocks);
  } finally {
    button.textContent = originalText;
    setChatLogButtonDisabled(button, false);
  }
}

async function handleBatchSaveAsAll(button, blocks) {
  const originalText = button.textContent;
  setChatLogButtonDisabled(button, true);
  button.textContent = "Selecting...";
  try {
    const folderPath = await promptUserForDownloadFolder();
    if (!folderPath) {
      return;
    }
    button.textContent = "Saving...";
    await downloadCodeBlocksSequentially(blocks, {
      overrideFolderPath: folderPath,
    });
    if (typeof showToast === "function") {
      showToast(`保存先: ${folderPath}`, "success");
    }
  } catch (error) {
    const message = (error && error.message) || "フォルダの指定に失敗しました";
    if (typeof showToast === "function") {
      showToast(message, "error");
    }
  } finally {
    button.textContent = originalText;
    setChatLogButtonDisabled(button, false);
  }
}

function createChatLogButton(label, variant = "secondary", size = "md") {
  const button = document.createElement("button");
  button.textContent = label;
  button.style.fontSize = size === "sm" ? "11px" : "12px";
  button.style.padding = size === "sm" ? "2px 8px" : "4px 10px";
  button.style.borderRadius = "4px";
  button.style.border = "1px solid rgba(255,255,255,0.3)";
  button.style.cursor = "pointer";
  button.style.transition = "opacity 0.2s ease";
  if (typeof cgptApplySharedButtonVariant === "function") {
    cgptApplySharedButtonVariant(button, variant);
  } else {
    const fallback = {
      accent: "#2563eb",
      success: "#059669",
      muted: "#4b5563",
      secondary: "#374151",
    };
    button.style.background = fallback[variant] || fallback.secondary;
    button.style.color = "#fff";
  }
  return button;
}

function setChatLogButtonDisabled(button, disabled) {
  if (!button) return;
  button.disabled = disabled;
  button.style.opacity = disabled ? "0.5" : "1";
  button.style.cursor = disabled ? "not-allowed" : "pointer";
}

function downloadCodeBlocksSequentially(blocks, options = {}) {
  const normalizedBlocks = Array.isArray(blocks) ? blocks : [];
  return normalizedBlocks.reduce((promise, block) => {
    return promise.then(() => createBlockDownloadPromise(block, options));
  }, Promise.resolve());
}

function createBlockDownloadPromise(block, options = {}) {
  return new Promise((resolve) => {
    triggerChatLogDownload(block.filePath, block.content, {
      saveAs: Boolean(options.saveAs),
      overrideFolderPath: options.overrideFolderPath,
      onDone: resolve,
    });
  });
}

function promptUserForDownloadFolder() {
  return new Promise((resolve, reject) => {
    const canSendRuntimeMessage =
      typeof chrome !== "undefined" &&
      chrome.runtime &&
      typeof chrome.runtime.sendMessage === "function";
    if (!canSendRuntimeMessage) {
      reject(new Error("フォルダ選択を開始できませんでした"));
      return;
    }

    chrome.runtime.sendMessage({ type: "pickDownloadFolder" }, (response) => {
      if (chrome.runtime && chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response) {
        reject(new Error("フォルダの指定に失敗しました"));
        return;
      }
      if (!response.ok) {
        if (response.error === "folder_picker_canceled") {
          resolve("");
          return;
        }
        reject(new Error(response.error || "フォルダの指定に失敗しました"));
        return;
      }
      resolve(response.folderPath || "");
    });
  });
}

function cgptJumpToCodeBlock(targetElement) {
  if (!targetElement) return;
  if (typeof highlightChatMessageElement === "function") {
    highlightChatMessageElement(targetElement);
    return;
  }
  if (typeof targetElement.scrollIntoView === "function") {
    targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function createBlockSaveButton(block) {
  const button = createChatLogButton("Save", "success", "sm");
  if (!block || !block.filePath) {
    setChatLogButtonDisabled(button, true);
    button.title = "File path not detected";
    return button;
  }
  button.addEventListener("click", () => {
    handleBlockSave(button, block, false);
  });
  return button;
}

function createBlockSaveAsButton(block) {
  const button = createChatLogButton("Save As", "secondary", "sm");
  if (!block || !block.filePath) {
    setChatLogButtonDisabled(button, true);
    button.title = "File path not detected";
    return button;
  }
  button.addEventListener("click", () => {
    handleBlockSave(button, block, true);
  });
  return button;
}

function handleBlockSave(button, block, saveAs) {
  if (!button || button.disabled || !block || !block.filePath) return;
  const originalText = button.textContent;
  setChatLogButtonDisabled(button, true);
  button.textContent = "Saving...";
  triggerChatLogDownload(block.filePath, block.content, {
    saveAs,
    onDone: () => {
      button.textContent = originalText;
      setChatLogButtonDisabled(button, false);
    },
  });
}

function createCodeMetaInfoElement(block) {
  const meta = document.createElement("div");
  meta.style.fontSize = "11px";
  meta.style.color = "#d1d5db";
  meta.style.background = "rgba(3, 7, 18, 0.6)";
  meta.style.border = "1px dashed #27272a";
  meta.style.borderRadius = "4px";
  meta.style.padding = "6px";
  meta.style.whiteSpace = "normal";
  meta.style.lineHeight = "1.4";
  meta.textContent = buildCodeMetaInfoText(block && block.content);
  return meta;
}

function buildCodeMetaInfoText(content) {
  if (!content) {
    return "No code detected in this block.";
  }
  const normalized = String(content).replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0).length;
  const totalChars = normalized.length;
  const summaryParts = [];
  summaryParts.push(`Lines: ${lines.length}`);
  summaryParts.push(`Non-empty: ${nonEmptyLines}`);
  summaryParts.push(`Characters: ${totalChars}`);
  return summaryParts.join(" ・ ");
}
