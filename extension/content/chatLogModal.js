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
  if (typeof cgptGetUiTheme === "function") {
    overlay.style.background = cgptGetUiTheme().overlayBackground;
  } else {
    overlay.style.background = "rgba(0,0,0,0.6)";
  }
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
  dialog.style.display = "flex";
  dialog.style.flexDirection = "column";
  if (typeof cgptApplySurfaceLayout === "function") {
    cgptApplySurfaceLayout(dialog, "dialog");
  } else {
    dialog.style.borderRadius = "16px";
    dialog.style.padding = "18px";
    dialog.style.width = "80%";
    dialog.style.maxWidth = "900px";
    dialog.style.maxHeight = "80%";
    dialog.style.gap = "12px";
  }
  if (typeof cgptApplySurfaceStyle === "function") {
    cgptApplySurfaceStyle(dialog, "dialog");
  } else {
    dialog.style.background = "#202123";
    dialog.style.color = "#fff";
    dialog.style.boxShadow = "0 10px 40px rgba(0,0,0,0.6)";
  }
  return dialog;
}

function cgptCreateChatLogHeader(closeModal) {
  const headerRow = document.createElement("div");
  headerRow.style.display = "flex";
  headerRow.style.justifyContent = "space-between";
  headerRow.style.alignItems = "center";

  const title = document.createElement("div");
  title.textContent = "Chat Log";
  if (typeof cgptApplyTextScale === "function") {
    cgptApplyTextScale(title, "title");
  } else {
    title.style.fontWeight = "700";
    title.style.fontSize = "16px";
  }
  headerRow.appendChild(title);

  const headerButtons = document.createElement("div");
  headerButtons.style.display = "flex";
  headerButtons.style.gap = "8px";

  const closeBtn = cgptCreateChatLogButton("Close", "secondary");
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
    if (typeof cgptApplyTextTone === "function") {
      cgptApplyTextTone(empty, "muted");
    } else {
      empty.style.color = "#9ca3af";
    }
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
  card.style.display = "flex";
  card.style.flexDirection = "column";
  if (typeof cgptApplySurfaceLayout === "function") {
    cgptApplySurfaceLayout(card, "card");
  } else {
    card.style.borderRadius = "14px";
    card.style.padding = "12px";
    card.style.gap = "8px";
  }
  if (typeof cgptApplySurfaceStyle === "function") {
    cgptApplySurfaceStyle(card, "card");
  } else {
    card.style.border = "1px solid #3f3f46";
    card.style.background = "#18181b";
  }

  card.appendChild(cgptCreateChatLogUserHeader(entry, closeModal));
  card.appendChild(cgptCreateChatLogMessageBody(entry));

  const assistantEntries = cgptCollectAssistantEntriesForUserEntry(entry, nextEntry, allEntries);
  const headingSections = cgptCollectAssistantHeadingSections(entry, nextEntry, allEntries);
  const assistantBlocks = cgptCollectAssistantBlocksForEntry(entry, nextEntry, allEntries);
  const assistantUrls = cgptCollectAssistantUrlsForEntry(entry, nextEntry, allEntries);
  const responseSection = cgptCreateChatLogAssistantSection(
    assistantEntries,
    headingSections,
    assistantBlocks,
    assistantUrls,
    closeModal
  );
  if (responseSection) {
    card.appendChild(responseSection);
  }

  return card;
}

function cgptCreateChatLogUserHeader(entry, closeModal) {
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.gap = "8px";

  header.appendChild(cgptCreateChatLogSectionTitle("User", entry && entry.timestamp));

  const jumpBtn = cgptCreateChatLogButton("Jump", "secondary", "sm");
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

function cgptCreateChatLogAssistantSection(
  assistantEntries,
  headingSections,
  assistantBlocks,
  assistantUrls,
  closeModal
) {
  const headingSection = cgptCreateChatLogHeadingsSection(headingSections);
  const blockSection = cgptCreateChatLogBlocksSection(assistantBlocks, closeModal);
  const urlSection = cgptCreateChatLogUrlsSection(assistantUrls);
  if (!headingSection && !blockSection && !urlSection) {
    return null;
  }

  const section = document.createElement("div");
  section.style.display = "flex";
  section.style.flexDirection = "column";
  section.style.gap = "6px";

  section.appendChild(
    cgptCreateChatLogSectionTitle(
      cgptGetAssistantDisplayLabel(Array.isArray(assistantEntries) ? assistantEntries[0] : null),
      Array.isArray(assistantEntries) && assistantEntries[0] ? assistantEntries[0].timestamp : ""
    )
  );

  if (headingSection) {
    section.appendChild(headingSection);
  }
  if (blockSection) {
    section.appendChild(blockSection);
  }
  if (urlSection) {
    section.appendChild(urlSection);
  }

  return section;
}

function cgptCreateChatLogSectionTitle(label, timestamp) {
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.flexWrap = "wrap";
  wrapper.style.columnGap = "8px";
  wrapper.style.rowGap = "2px";

  const labelEl = document.createElement("div");
  labelEl.textContent = label;
  if (typeof cgptApplyTextScale === "function") {
    cgptApplyTextScale(labelEl, "sectionLabel");
  } else {
    labelEl.style.fontSize = "12px";
    labelEl.style.fontWeight = "600";
  }
  if (typeof cgptApplyTextTone === "function") {
    cgptApplyTextTone(labelEl, "secondary");
  } else {
    labelEl.style.color = "#d1d5db";
  }
  wrapper.appendChild(labelEl);

  if (timestamp) {
    const timeEl = document.createElement("div");
    timeEl.textContent = cgptFormatChatLogTimestamp(timestamp);
    if (typeof cgptApplyTextScale === "function") {
      cgptApplyTextScale(timeEl, "meta");
    } else {
      timeEl.style.fontSize = "11px";
    }
    if (typeof cgptApplyTextTone === "function") {
      cgptApplyTextTone(timeEl, "muted");
    } else {
      timeEl.style.color = "#9ca3af";
    }
    wrapper.appendChild(timeEl);
  }

  return wrapper;
}

function cgptGetAssistantDisplayLabel(entry) {
  const candidates = [];

  if (entry && typeof entry.modelLabel === "string") {
    candidates.push(entry.modelLabel);
  }

  if (entry && entry.element) {
    candidates.push(entry.element.getAttribute("data-model-slug"));
    candidates.push(entry.element.getAttribute("data-model-name"));
    candidates.push(entry.element.getAttribute("data-message-model-slug"));
    candidates.push(entry.element.getAttribute("data-message-model-name"));
    candidates.push(entry.element.dataset ? entry.element.dataset.modelSlug : "");
    candidates.push(entry.element.dataset ? entry.element.dataset.modelName : "");
    candidates.push(entry.element.dataset ? entry.element.dataset.messageModelSlug : "");
    candidates.push(entry.element.dataset ? entry.element.dataset.messageModelName : "");
  }

  const domCandidates = [
    "[data-testid='model-switcher-dropdown-button']",
    "[data-testid='model-switcher']",
    "button[id*='model']",
    "button[aria-haspopup='menu']",
  ];

  domCandidates.forEach((selector) => {
    const el = document.querySelector(selector);
    if (el && el.textContent) {
      candidates.push(el.textContent);
    }
  });

  for (const candidate of candidates) {
    const normalized = cgptNormalizeAssistantDisplayLabel(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return "AI";
}

function cgptNormalizeAssistantDisplayLabel(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";

  const cleaned = text
    .replace(/^chatgpt\s*/i, "")
    .replace(/\btemporary chat\b/gi, "")
    .replace(/\bnew chat\b/gi, "")
    .replace(/\bshare\b/gi, "")
    .replace(/\bsearch\b/gi, "")
    .trim();

  if (!cleaned) return "";

  const slugMatch = cleaned.match(/^gpt-(\d+)(?:-(\d+))?(?:-(.+))?$/i);
  if (slugMatch) {
    const [, major, minor, suffix] = slugMatch;
    const version = minor ? `${major}.${minor}` : major;
    const suffixText = suffix
      ? suffix
          .split("-")
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ")
      : "";
    return `GPT ${version}${suffixText ? ` ${suffixText}` : ""}`;
  }

  const gptMatch = cleaned.match(/\b(gpt[\s-]*\d(?:\.\d+)?(?:\s+[a-z0-9.-]+)*)\b/i);
  if (gptMatch && gptMatch[1]) {
    return gptMatch[1]
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  if (/^(o\d|o\d-mini|o\d-pro)/i.test(cleaned)) {
    return cleaned;
  }

  return cleaned.length <= 40 ? cleaned : cleaned.slice(0, 40).trim();
}

function cgptCreateChatLogMessageBody(entry) {
  const messageBody = document.createElement("div");
  messageBody.style.whiteSpace = "pre-wrap";
  if (typeof cgptApplyTextScale === "function") {
    cgptApplyTextScale(messageBody, "body");
  } else {
    messageBody.style.fontSize = "13px";
    messageBody.style.lineHeight = "1.5";
  }
  if (typeof cgptApplyTextTone === "function") {
    cgptApplyTextTone(messageBody, "primary");
  } else {
    messageBody.style.color = "#f3f4f6";
  }
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
  if (typeof cgptApplyTextScale === "function") {
    cgptApplyTextScale(blockHeaderLabel, "sectionLabel");
  } else {
    blockHeaderLabel.style.fontSize = "12px";
  }
  if (typeof cgptApplyTextTone === "function") {
    cgptApplyTextTone(blockHeaderLabel, "accent");
  } else {
    blockHeaderLabel.style.color = "#a5b4fc";
  }
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
  blockWrapper.style.background = "#111827";
  blockWrapper.style.display = "flex";
  blockWrapper.style.flexDirection = "column";
  if (typeof cgptApplySurfaceLayout === "function") {
    cgptApplySurfaceLayout(blockWrapper, "sectionCard");
  } else {
    blockWrapper.style.borderRadius = "12px";
    blockWrapper.style.padding = "8px";
    blockWrapper.style.gap = "6px";
  }

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

  const jumpBtn = cgptCreateChatLogButton("Jump", "secondary", "sm");
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
  if (typeof cgptApplyTextScale === "function") {
    cgptApplyTextScale(headingHeader, "sectionLabel");
  } else {
    headingHeader.style.fontSize = "12px";
  }
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
  details.style.background = "#0b1324";
  details.style.marginLeft = `${Math.min(depth, 4) * 12}px`;
  if (typeof cgptApplySurfaceLayout === "function") {
    cgptApplySurfaceLayout(details, "sectionCard");
  } else {
    details.style.borderRadius = "12px";
    details.style.padding = "8px";
  }

  const summary = document.createElement("summary");
  summary.style.cursor = "pointer";
  summary.style.display = "flex";
  summary.style.alignItems = "center";
  summary.style.gap = "6px";
  summary.style.listStyle = "none";

  const levelBadge = document.createElement("span");
  levelBadge.textContent = `H${node.level}`;
  levelBadge.title = node.originalLevel ? `Original level: H${node.originalLevel}` : "";
  levelBadge.style.fontSize = "10px";
  levelBadge.style.fontWeight = "bold";
  levelBadge.style.padding = "2px 6px";
  levelBadge.style.borderRadius = "999px";
  levelBadge.style.background = "rgba(255,255,255,0.1)";
  levelBadge.style.color = "#c084fc";
  summary.appendChild(levelBadge);

  const title = document.createElement("span");
  title.textContent = node.title || "(untitled heading)";
  if (typeof cgptApplyTextScale === "function") {
    cgptApplyTextScale(title, "sectionLabel");
  } else {
    title.style.fontSize = "12px";
  }
  title.style.color = "#e5e7eb";
  title.style.flex = "1";
  summary.appendChild(title);

  details.appendChild(summary);

  const content = document.createElement("div");
  content.style.marginTop = "6px";
  if (typeof cgptApplyTextScale === "function") {
    cgptApplyTextScale(content, "body");
    content.style.fontSize = "12px";
  } else {
    content.style.fontSize = "12px";
    content.style.lineHeight = "1.5";
  }
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
  if (typeof cgptApplyTextScale === "function") {
    cgptApplyTextScale(fileNameText, "sectionLabel");
  } else {
    fileNameText.style.fontSize = "12px";
    fileNameText.style.fontWeight = "600";
  }
  fileNameText.style.color = "#facc15";
  fileNameLabel.appendChild(fileNameText);

  const metaInfoText = document.createElement("span");
  metaInfoText.textContent = cgptBuildCodeMetaInfoText(block && block.content);
  if (typeof cgptApplyTextScale === "function") {
    cgptApplyTextScale(metaInfoText, "meta");
  } else {
    metaInfoText.style.fontSize = "11px";
  }
  metaInfoText.style.color = "#fef3c7";
  metaInfoText.style.opacity = "0.85";
  fileNameLabel.appendChild(metaInfoText);

  fileInfoWrapper.appendChild(fileNameLabel);

  const filePathLabel = document.createElement("div");
  filePathLabel.textContent = block.filePath;
  if (typeof cgptApplyTextScale === "function") {
    cgptApplyTextScale(filePathLabel, "meta");
  } else {
    filePathLabel.style.fontSize = "11px";
  }
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
  if (typeof cgptApplyTextScale === "function") {
    cgptApplyTextScale(urlHeader, "sectionLabel");
  } else {
    urlHeader.style.fontSize = "12px";
  }
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
  urlWrapper.style.background = "#0f172a";
  urlWrapper.style.display = "flex";
  urlWrapper.style.flexDirection = "column";
  if (typeof cgptApplySurfaceLayout === "function") {
    cgptApplySurfaceLayout(urlWrapper, "sectionCard");
  } else {
    urlWrapper.style.borderRadius = "12px";
    urlWrapper.style.padding = "8px";
    urlWrapper.style.gap = "6px";
  }

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
  if (typeof cgptApplyTextScale === "function") {
    cgptApplyTextScale(urlDisplayText, "sectionLabel");
  } else {
    urlDisplayText.style.fontSize = "12px";
    urlDisplayText.style.fontWeight = "600";
  }
  urlDisplayText.style.color = "#bae6fd";
  urlLabelWrapper.appendChild(urlDisplayText);

  const urlValue = document.createElement("div");
  urlValue.textContent = link.url;
  if (typeof cgptApplyTextScale === "function") {
    cgptApplyTextScale(urlValue, "meta");
  } else {
    urlValue.style.fontSize = "11px";
  }
  urlValue.style.color = "#e0f2fe";
  urlValue.style.opacity = "0.9";
  urlLabelWrapper.appendChild(urlValue);

  urlHeaderRow.appendChild(urlLabelWrapper);

  const openBtn = cgptCreateChatLogButton("Open Link", "secondary", "sm");
  openBtn.addEventListener("click", () => {
    window.open(link.url, "_blank", "noopener,noreferrer");
  });
  urlHeaderRow.appendChild(openBtn);

  urlWrapper.appendChild(urlHeaderRow);
  return urlWrapper;
}
