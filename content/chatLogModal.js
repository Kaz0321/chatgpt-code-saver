const CHAT_LOG_PREVIEW_LINE_LIMIT = 1;

function openChatLogModal() {
  if (document.getElementById("cgpt-helper-chatlog-modal")) return;
  if (typeof getChatLogEntries !== "function") {
    alert("Failed to initialize the chat log.");
    return;
  }

  const allEntries = getChatLogEntries();
  const userEntries = allEntries.filter((entry) => entry.role === "user");
  const { overlay, closeModal } = cgptCreateChatLogModalOverlay();
  const dialog = cgptCreateChatLogDialog();

  dialog.appendChild(cgptCreateChatLogHeader(closeModal));
  dialog.appendChild(cgptCreateChatLogList(userEntries, allEntries, closeModal));

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  });
}

function cgptCreateChatLogModalOverlay() {
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

  return { overlay, closeModal };
}

function cgptCreateChatLogDialog() {
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
  return dialog;
}

function cgptCreateChatLogHeader(closeModal) {
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

  const closeBtn = cgptCreateChatLogButton("Close", "muted");
  closeBtn.addEventListener("click", closeModal);
  headerButtons.appendChild(closeBtn);

  headerRow.appendChild(headerButtons);
  return headerRow;
}

function cgptCreateChatLogList(userEntries, allEntries, closeModal) {
  const list = document.createElement("div");
  list.style.flex = "1";
  list.style.overflow = "auto";
  list.style.display = "flex";
  list.style.flexDirection = "column";
  list.style.gap = "12px";

  const orderedUsers = [...userEntries].sort((a, b) => a.order - b.order);
  if (orderedUsers.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "No user messages found.";
    empty.style.color = "#9ca3af";
    list.appendChild(empty);
    return list;
  }

  orderedUsers.forEach((entry, index) => {
    const nextEntry = orderedUsers[index + 1];
    const card = cgptCreateChatLogUserCard(entry, nextEntry, allEntries, closeModal);
    list.appendChild(card);
  });

  return list;
}

function cgptCreateChatLogUserCard(entry, nextEntry, allEntries, closeModal) {
  const card = document.createElement("div");
  card.style.border = "1px solid #3f3f46";
  card.style.borderRadius = "8px";
  card.style.padding = "10px";
  card.style.background = "#18181b";
  card.style.display = "flex";
  card.style.flexDirection = "column";
  card.style.gap = "6px";

  card.appendChild(cgptCreateChatLogUserHeader(entry, closeModal));
  card.appendChild(cgptCreateChatLogMessageBody(entry));

  const headingSections = cgptCollectAssistantHeadingSections(entry, nextEntry, allEntries);
  const headingSection = cgptCreateChatLogHeadingsSection(headingSections);
  if (headingSection) {
    card.appendChild(headingSection);
  }

  const assistantBlocks = cgptCollectAssistantBlocksForEntry(entry, nextEntry, allEntries);
  const blockSection = cgptCreateChatLogBlocksSection(assistantBlocks, closeModal);
  if (blockSection) {
    card.appendChild(blockSection);
  }

  const assistantUrls = cgptCollectAssistantUrlsForEntry(entry, nextEntry, allEntries);
  const urlSection = cgptCreateChatLogUrlsSection(assistantUrls);
  if (urlSection) {
    card.appendChild(urlSection);
  }

  return card;
}

function cgptCreateChatLogUserHeader(entry, closeModal) {
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.gap = "8px";

  const info = document.createElement("div");
  info.style.flex = "1";
  info.style.fontSize = "12px";
  info.style.color = "#d1d5db";
  info.textContent = `Sent ${cgptFormatChatLogTimestamp(entry.timestamp)}`;
  header.appendChild(info);

  const jumpBtn = cgptCreateChatLogButton("Jump", "accent", "sm");
  jumpBtn.addEventListener("click", () => {
    closeModal();
    if (typeof highlightChatMessageElement === "function") {
      highlightChatMessageElement(entry.element);
    } else {
      cgptJumpToCodeBlock(entry.element);
    }
  });
  header.appendChild(jumpBtn);

  return header;
}

function cgptCreateChatLogMessageBody(entry) {
  const messageBody = document.createElement("div");
  messageBody.style.whiteSpace = "pre-wrap";
  messageBody.style.fontSize = "13px";
  messageBody.style.lineHeight = "1.5";
  messageBody.style.color = "#f3f4f6";
  const messageText = entry.text || "(no text)";
  messageBody.textContent = cgptCreateSingleLinePreview(messageText, CHAT_LOG_PREVIEW_LINE_LIMIT);
  return messageBody;
}

function cgptCreateChatLogBlocksSection(blocks, closeModal) {
  if (!blocks || !blocks.length) {
    return null;
  }

  const section = document.createElement("div");
  section.style.display = "flex";
  section.style.flexDirection = "column";
  section.style.gap = "6px";

  const blockHeader = document.createElement("div");
  blockHeader.style.display = "flex";
  blockHeader.style.alignItems = "center";
  blockHeader.style.justifyContent = "space-between";
  blockHeader.style.gap = "8px";

  const blockHeaderLabel = document.createElement("div");
  blockHeaderLabel.textContent = `Code blocks (${blocks.length})`;
  blockHeaderLabel.style.fontSize = "12px";
  blockHeaderLabel.style.color = "#a5b4fc";
  blockHeader.appendChild(blockHeaderLabel);

  const blockHeaderActions = document.createElement("div");
  blockHeaderActions.style.display = "flex";
  blockHeaderActions.style.gap = "6px";
  blockHeaderActions.appendChild(cgptCreateBatchSaveAllButton(blocks));
  blockHeaderActions.appendChild(cgptCreateBatchSaveAsAllButton(blocks));
  blockHeader.appendChild(blockHeaderActions);

  section.appendChild(blockHeader);

  blocks.forEach((block) => {
    section.appendChild(cgptCreateChatLogCodeBlockCard(block, closeModal));
  });

  return section;
}

function cgptCreateChatLogCodeBlockCard(block, closeModal) {
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

  const fileInfoWrapper = cgptCreateChatLogBlockInfo(block);
  blockHeaderRow.appendChild(fileInfoWrapper);

  const blockActionWrapper = document.createElement("div");
  blockActionWrapper.style.display = "flex";
  blockActionWrapper.style.gap = "6px";
  blockActionWrapper.style.flexWrap = "wrap";

  blockActionWrapper.appendChild(cgptCreateBlockSaveButton(block));
  blockActionWrapper.appendChild(cgptCreateBlockSaveAsButton(block));

  const jumpBtn = cgptCreateChatLogButton("Jump", "accent", "sm");
  jumpBtn.addEventListener("click", () => {
    closeModal();
    cgptJumpToCodeBlock(block.element);
  });
  blockActionWrapper.appendChild(jumpBtn);

  blockHeaderRow.appendChild(blockActionWrapper);
  blockWrapper.appendChild(blockHeaderRow);

  return blockWrapper;
}

function cgptCreateChatLogHeadingsSection(headingSections) {
  const totalHeadings = cgptCountHeadingNodes(headingSections);
  if (!totalHeadings) {
    return null;
  }

  const section = document.createElement("div");
  section.style.display = "flex";
  section.style.flexDirection = "column";
  section.style.gap = "6px";

  const headingHeader = document.createElement("div");
  headingHeader.textContent = `Markdown headings (${totalHeadings})`;
  headingHeader.style.fontSize = "12px";
  headingHeader.style.color = "#f9a8d4";
  section.appendChild(headingHeader);

  headingSections.forEach((rootNode) => {
    section.appendChild(cgptCreateHeadingNodeElement(rootNode, 0));
  });

  return section;
}

function cgptCreateHeadingNodeElement(node, depth) {
  const details = document.createElement("details");
  details.open = depth === 0;
  details.style.border = "1px solid #27272a";
  details.style.borderRadius = "6px";
  details.style.background = "#0b1324";
  details.style.padding = "6px";
  details.style.marginLeft = `${Math.min(depth, 4) * 12}px`;

  const summary = document.createElement("summary");
  summary.style.cursor = "pointer";
  summary.style.display = "flex";
  summary.style.alignItems = "center";
  summary.style.gap = "6px";
  summary.style.listStyle = "none";

  const levelBadge = document.createElement("span");
  levelBadge.textContent = `H${node.level}`;
  levelBadge.style.fontSize = "10px";
  levelBadge.style.fontWeight = "bold";
  levelBadge.style.padding = "2px 6px";
  levelBadge.style.borderRadius = "999px";
  levelBadge.style.background = "rgba(255,255,255,0.1)";
  levelBadge.style.color = "#c084fc";
  summary.appendChild(levelBadge);

  const title = document.createElement("span");
  title.textContent = node.title || "(untitled heading)";
  title.style.fontSize = "12px";
  title.style.color = "#e5e7eb";
  title.style.flex = "1";
  summary.appendChild(title);

  details.appendChild(summary);

  const content = document.createElement("div");
  content.style.marginTop = "6px";
  content.style.fontSize = "12px";
  content.style.lineHeight = "1.5";
  content.style.color = "#f3f4f6";
  content.style.whiteSpace = "pre-wrap";
  content.textContent = node.content || "(no content under this heading)";
  details.appendChild(content);

  if (Array.isArray(node.children) && node.children.length) {
    node.children.forEach((child) => {
      details.appendChild(cgptCreateHeadingNodeElement(child, depth + 1));
    });
  }

  return details;
}

function cgptCreateChatLogBlockInfo(block) {
  const fileInfoWrapper = document.createElement("div");
  fileInfoWrapper.style.flex = "1";
  fileInfoWrapper.style.display = "flex";
  fileInfoWrapper.style.flexDirection = "column";
  fileInfoWrapper.style.gap = "2px";

  const fileNameLabel = document.createElement("div");
  fileNameLabel.style.display = "flex";
  fileNameLabel.style.flexWrap = "wrap";
  fileNameLabel.style.alignItems = "baseline";
  fileNameLabel.style.columnGap = "6px";

  const fileNameText = document.createElement("span");
  fileNameText.textContent = block.fileName || block.filePath;
  fileNameText.style.fontSize = "12px";
  fileNameText.style.color = "#facc15";
  fileNameText.style.fontWeight = "bold";
  fileNameLabel.appendChild(fileNameText);

  const metaInfoText = document.createElement("span");
  metaInfoText.textContent = cgptBuildCodeMetaInfoText(block && block.content);
  metaInfoText.style.fontSize = "11px";
  metaInfoText.style.color = "#fef3c7";
  metaInfoText.style.opacity = "0.85";
  fileNameLabel.appendChild(metaInfoText);

  fileInfoWrapper.appendChild(fileNameLabel);

  const filePathLabel = document.createElement("div");
  filePathLabel.textContent = block.filePath;
  filePathLabel.style.fontSize = "11px";
  filePathLabel.style.color = "#fef3c7";
  filePathLabel.style.opacity = "0.9";
  fileInfoWrapper.appendChild(filePathLabel);

  return fileInfoWrapper;
}

function cgptCreateChatLogUrlsSection(assistantUrls) {
  if (!assistantUrls || !assistantUrls.length) {
    return null;
  }
  const section = document.createElement("div");
  section.style.display = "flex";
  section.style.flexDirection = "column";
  section.style.gap = "6px";

  const urlHeader = document.createElement("div");
  urlHeader.textContent = `Links Provided (${assistantUrls.length})`;
  urlHeader.style.fontSize = "12px";
  urlHeader.style.color = "#7dd3fc";
  section.appendChild(urlHeader);

  assistantUrls.forEach((link) => {
    section.appendChild(cgptCreateChatLogUrlCard(link));
  });

  return section;
}

function cgptCreateChatLogUrlCard(link) {
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

  const openBtn = cgptCreateChatLogButton("Open Link", "accent", "sm");
  openBtn.addEventListener("click", () => {
    window.open(link.url, "_blank", "noopener,noreferrer");
  });
  urlHeaderRow.appendChild(openBtn);

  urlWrapper.appendChild(urlHeaderRow);
  return urlWrapper;
}
