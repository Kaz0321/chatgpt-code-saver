const CHAT_LOG_SELECTOR = "[data-message-author-role]";
const chatLogEntries = [];
const chatLogTrackedIds = new Set();
let chatLogOrderCounter = 0;
let chatLogTrackerInitialized = false;
let chatLogHighlightStyleInjected = false;
let chatLogTimestampStyleInjected = false;
let chatLogFoldStyleInjected = false;
const CGPT_FOLD_LEVEL_COLORS = [
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#f59e0b",
  "#38bdf8",
  "#c084fc",
];
const CGPT_FOLD_INDENT_STEP_PX = 6;
const CGPT_FOLD_GUIDE_STEP_PX = 12;
const CGPT_FOLD_LINE_LEFT_BASE_PX = 8;
const CGPT_FOLD_CONTENT_LEFT_BASE_PX = 18;
const CGPT_FOLD_LINE_WIDTH_PX = 1;
const CGPT_FOLD_CHIP_FONT_SIZE_PX = 11;
const CGPT_FOLD_CHIP_MIN_HEIGHT_PX = 22;
const CGPT_FOLD_CHIP_PADDING = "0 8px";
const CGPT_FOLD_CHIP_RADIUS = "999px";

function cgptApplyFoldChipStyle(element) {
  if (!element || !element.style) return;
  element.style.display = "inline-flex";
  element.style.alignItems = "center";
  element.style.justifyContent = "center";
  element.style.minHeight = `${CGPT_FOLD_CHIP_MIN_HEIGHT_PX}px`;
  element.style.padding = CGPT_FOLD_CHIP_PADDING;
  element.style.fontSize = `${CGPT_FOLD_CHIP_FONT_SIZE_PX}px`;
  element.style.lineHeight = "1";
  element.style.borderRadius = CGPT_FOLD_CHIP_RADIUS;
  element.style.boxSizing = "border-box";
  element.style.whiteSpace = "nowrap";
}

function cgptGetFoldLevelColor(level) {
  const paletteIndex = Math.min(
    Math.max(Number.parseInt(level, 10) || 0, 0),
    CGPT_FOLD_LEVEL_COLORS.length - 1
  );
  const color = CGPT_FOLD_LEVEL_COLORS[paletteIndex];
  return color || CGPT_FOLD_LEVEL_COLORS[0];
}

function cgptApplyFoldState(foldElement, isOpen) {
  if (!foldElement) return;
  const open = isOpen !== false;
  foldElement.dataset.cgptHelperFoldOpen = open ? "1" : "0";
  foldElement.classList.toggle("cgpt-helper-fold-collapsed", !open);
  foldElement.querySelectorAll(".cgpt-helper-fold-action-button").forEach((btn) => {
    if (!btn.dataset.cgptHelperFoldAction) return;
    const action = btn.dataset.cgptHelperFoldAction;
    if (action === "compact") {
      if (typeof cgptSetSharedButtonDisabled === "function") {
        cgptSetSharedButtonDisabled(btn, !open);
      } else {
        btn.disabled = !open;
      }
      btn.classList.toggle("cgpt-helper-fold-action-disabled", !open);
    }
    if (action === "expand") {
      if (typeof cgptSetSharedButtonDisabled === "function") {
        cgptSetSharedButtonDisabled(btn, open);
      } else {
        btn.disabled = open;
      }
      btn.classList.toggle("cgpt-helper-fold-action-disabled", open);
    }
  });
}

function cgptApplyFoldToggleTheme(button) {
  if (!button) return;
  cgptApplyFoldActionTheme(button);
}

function cgptApplyFoldActionTheme(button) {
  if (!button) return;
  const theme = typeof cgptGetUiTheme === "function" ? cgptGetUiTheme() : null;
  if (typeof cgptSetSharedButtonCustomPalette === "function") {
    cgptSetSharedButtonCustomPalette(button, {
      background: theme ? theme.chipBackground : "rgba(255, 255, 255, 0.05)",
      hoverBackground: "rgba(148, 163, 184, 0.12)",
      activeBackground: "rgba(148, 163, 184, 0.16)",
      border: theme ? theme.chipBorder : "rgba(255, 255, 255, 0.16)",
      hoverBorder: "rgba(148, 163, 184, 0.24)",
      activeBorder: "rgba(148, 163, 184, 0.28)",
      color: theme ? theme.chipText : "rgba(255, 255, 255, 0.9)",
      focusRing: "rgba(147, 197, 253, 0.18)",
    });
    return;
  }
  button.style.background = theme ? theme.chipBackground : "rgba(255, 255, 255, 0.05)";
  button.style.borderColor = theme ? theme.chipBorder : "rgba(255, 255, 255, 0.16)";
  button.style.color = theme ? theme.chipText : "rgba(255, 255, 255, 0.9)";
}

function cgptCreateFoldSection({
  title,
  initiallyOpen = true,
  level = 0,
  visualLevel = level,
  badgeText = "",
  actions = {},
}) {
  const fold = document.createElement("div");
  fold.className = "cgpt-helper-fold";
  const parsedLevel = Number.parseInt(level, 10);
  const numericLevel = Number.isFinite(parsedLevel) ? Math.max(0, parsedLevel) : 0;
  const clampedLevel = Math.min(numericLevel, 6);
  const parsedVisualLevel = Number.parseInt(visualLevel, 10);
  const numericVisualLevel = Number.isFinite(parsedVisualLevel) ? Math.max(0, parsedVisualLevel) : 0;
  const clampedVisualLevel = Math.min(numericVisualLevel, 6);
  fold.style.setProperty("--cgpt-helper-fold-level", `${clampedVisualLevel}`);
  fold.style.setProperty(
    "--cgpt-helper-fold-indent",
    `${clampedVisualLevel > 1 ? CGPT_FOLD_INDENT_STEP_PX : 0}px`
  );
  fold.style.setProperty("--cgpt-helper-fold-line-offset", "0px");
  fold.style.setProperty("--cgpt-helper-fold-color", cgptGetFoldLevelColor(clampedLevel));
  fold.dataset.cgptHelperFoldLevel = `${clampedLevel}`;
  if (numericVisualLevel > 0) {
    fold.classList.add("cgpt-helper-fold-nested");
  }

  const header = document.createElement("div");
  header.className = "cgpt-helper-fold-header";

  const titleWrapper = document.createElement("div");
  titleWrapper.className = "cgpt-helper-fold-title";
  if (badgeText) {
    const badge = document.createElement("span");
    badge.className = "cgpt-helper-fold-title-badge";
    badge.textContent = badgeText;
    titleWrapper.appendChild(badge);
  }
  if (title) {
    const titleText = document.createElement("span");
    titleText.className = "cgpt-helper-fold-title-text";
    titleText.textContent = title;
    titleWrapper.appendChild(titleText);
  }
  header.appendChild(titleWrapper);

  const actionsWrapper = document.createElement("div");
  actionsWrapper.className = "cgpt-helper-fold-actions";
  const buttons = cgptCreateFoldActionButtons(actions);
  buttons.forEach((btn) => actionsWrapper.appendChild(btn));
  header.appendChild(actionsWrapper);
  fold.appendChild(header);

  const body = document.createElement("div");
  body.className = "cgpt-helper-fold-body";
  fold.appendChild(body);

  let isOpen = initiallyOpen !== false;
  const updateState = () => {
    cgptApplyFoldState(fold, isOpen);
  };

  buttons.forEach((btn) => {
    if (!btn.dataset.cgptHelperFoldAction) return;
    const action = btn.dataset.cgptHelperFoldAction;
    if (action === "compact") {
      btn.addEventListener("click", () => {
        isOpen = false;
        updateState();
      });
    }
    if (action === "expand") {
      btn.addEventListener("click", () => {
        isOpen = true;
        updateState();
      });
    }
  });

  updateState();

  return { container: fold, body, titleWrapper };
}

function cgptCreateFoldActionButtons(actionConfig = {}) {
  const buttons = [];
  const {
    onSave,
    onSaveAs,
    onCopy,
    showSave = true,
    showSaveAs = true,
    showCopy = true,
  } = actionConfig || {};

  const addButton = (label, variant, actionKey, handler, shouldShow = true) => {
    if (!shouldShow) return;
    const button = cgptCreateFoldActionButton(label, variant);
    if (actionKey) {
      button.dataset.cgptHelperFoldAction = actionKey;
    }
    if (actionKey === "compact" || actionKey === "expand") {
      button.classList.add("cgpt-helper-fold-toggle");
      cgptApplyFoldToggleTheme(button);
    }
    if (typeof handler === "function") {
      button.addEventListener("click", handler);
    } else if (actionKey !== "compact" && actionKey !== "expand") {
      button.disabled = true;
      button.classList.add("cgpt-helper-fold-action-disabled");
    }
    buttons.push(button);
  };

  addButton("Save", "primary", "save", onSave, showSave);
  addButton("Save As", "secondary", "saveAs", onSaveAs, showSaveAs);
  addButton("Copy", "ghost", "copy", onCopy, showCopy);
  addButton("Compact", "secondary", "compact", null, true);
  addButton("Expand", "secondary", "expand", null, true);

  return buttons;
}

function cgptCreateFoldActionButton(label, variant = "secondary") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cgpt-helper-fold-action-button";
  button.textContent = label;
  if (typeof cgptApplySharedButtonStyle === "function") {
    cgptApplySharedButtonStyle(button, { variant, size: "sm" });
  } else {
    const palette = {
      primary: { background: "#2563eb", color: "#fff", border: "rgba(255,255,255,0.25)" },
      secondary: { background: "#374151", color: "#f3f4f6", border: "rgba(255,255,255,0.2)" },
      ghost: { background: "transparent", color: "#e5e7eb", border: "rgba(255,255,255,0.18)" },
    };
    const paletteEntry = palette[variant] || palette.secondary;
    button.style.background = paletteEntry.background;
    button.style.color = paletteEntry.color;
    button.style.border = `1px solid ${paletteEntry.border}`;
  }
  cgptApplyFoldChipStyle(button);
  cgptApplyFoldActionTheme(button);
  button.style.boxShadow = "none";
  button.style.minWidth = "0";
  return button;
}

function cgptBuildChatFoldActions(entry) {
  const textSupplier = () => (entry && entry.text ? entry.text : "");
  const canSave = Boolean(cgptNormalizePlainText(textSupplier()).trim());
  const resolvedCopy = () => cgptCopyPlainText(textSupplier());
  const resolvedSave = () => cgptSaveChatResponseText(entry, textSupplier(), false);
  const resolvedSaveAs = () => cgptSaveChatResponseText(entry, textSupplier(), true);
  return {
    onSave: canSave ? resolvedSave : null,
    onSaveAs: canSave ? resolvedSaveAs : null,
    onCopy: resolvedCopy,
    showSave: canSave,
    showSaveAs: canSave,
    showCopy: true,
  };
}

function cgptNormalizePlainText(text) {
  if (typeof cgptNormalizeChatLogLineEndings === "function") {
    return cgptNormalizeChatLogLineEndings(text);
  }
  return String(text || "");
}

function cgptSaveChatResponseText(entry, rawText, saveAs = false) {
  const normalized = cgptNormalizePlainText(rawText || (entry && entry.text));
  const trimmed = normalized.trim();
  if (!trimmed) {
    return;
  }
  const filePath = cgptBuildResponseFilePath(entry);
  if (typeof cgptTriggerChatLogDownload === "function") {
    cgptTriggerChatLogDownload(filePath, trimmed, { saveAs });
    return;
  }
  cgptDownloadTextLocally(filePath, trimmed);
}

function cgptCopyPlainText(text) {
  const normalized = cgptNormalizePlainText(text).trim();
  if (!normalized) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(normalized);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = normalized;
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function cgptBuildResponseFilePath(entry) {
  const rolePrefix = entry && entry.role === "assistant" ? "response" : "message";
  const timestamp = (() => {
    if (entry && entry.timestamp) {
      const date = new Date(entry.timestamp);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    return new Date().toISOString();
  })();
  const safe = timestamp.replace(/[:.]/g, "-");
  return `${rolePrefix}-${safe}.txt`;
}

function cgptDownloadTextLocally(fileName, content) {
  try {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (e) {
    // noop
  }
}

function initChatLogTracker(root = document) {
  if (chatLogTrackerInitialized) return;
  chatLogTrackerInitialized = true;
  ensureChatLogHighlightStyle();
  if (typeof cgptSetCurrentConversationKey === "function") {
    cgptSetCurrentConversationKey(getConversationKey());
  }
  captureChatLogsFromNode(root);
  startChatLogMutationObserver();
  startChatRouteWatcher();
}

function resetChatLogEntries() {
  chatLogEntries.length = 0;
  chatLogTrackedIds.clear();
  chatLogOrderCounter = 0;
  if (document && typeof document.querySelectorAll === "function") {
    document.querySelectorAll("[data-cgpt-helper-chat-tracked='1']").forEach((el) => {
      delete el.dataset.cgptHelperChatTracked;
    });
  }
}

function ensureChatLogHighlightStyle() {
  if (chatLogHighlightStyleInjected) return;
  const style = document.createElement("style");
  style.textContent = `
    .cgpt-helper-chatlog-highlight {
      outline: 3px solid #fbbf24 !important;
      border-radius: 12px;
      animation: cgpt-helper-chatlog-pulse 2s ease;
    }
    @keyframes cgpt-helper-chatlog-pulse {
      0% { outline-color: #fbbf24; }
      50% { outline-color: rgba(251, 191, 36, 0.2); }
      100% { outline-color: transparent; }
    }
  `;
  document.head.appendChild(style);
  chatLogHighlightStyleInjected = true;
}

function ensureChatLogTimestampStyle() {
  if (chatLogTimestampStyleInjected) return;
  const style = document.createElement("style");
  style.textContent = `
    .cgpt-helper-chatlog-timestamp-wrapper {
      display: flex;
      align-items: center;
    }
    .cgpt-helper-chatlog-timestamp-label {
      font-size: 12px;
      color: #9ca3af;
      line-height: 1.4;
      white-space: nowrap;
    }
  `;
  document.head.appendChild(style);
  chatLogTimestampStyleInjected = true;
}

function captureChatLogsFromNode(rootNode) {
  if (!rootNode) return;

  if (rootNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    Array.from(rootNode.childNodes).forEach((child) => {
      captureChatLogsFromNode(child);
    });
    return;
  }

  if (rootNode.nodeType === Node.DOCUMENT_NODE) {
    rootNode.querySelectorAll(CHAT_LOG_SELECTOR).forEach((el) => {
      processChatMessageElement(el);
    });
    return;
  }

  if (rootNode.nodeType !== Node.ELEMENT_NODE) return;

  if (rootNode.matches && rootNode.matches(CHAT_LOG_SELECTOR)) {
    processChatMessageElement(rootNode);
  }
  rootNode.querySelectorAll(CHAT_LOG_SELECTOR).forEach((el) => {
    processChatMessageElement(el);
  });
}

function processChatMessageElement(el) {
  if (!el || el.dataset.cgptHelperChatTracked === "1") return;

  const role = (el.getAttribute("data-message-author-role") || "").toLowerCase();
  if (role !== "user" && role !== "assistant") return;

  const rawId =
    el.getAttribute("data-message-id") ||
    el.dataset.messageId ||
    el.getAttribute("data-id") ||
    null;
  const entryId = rawId || `cgpt-helper-chat-${role}-${Date.now()}-${chatLogOrderCounter}`;
  if (chatLogTrackedIds.has(entryId)) {
    el.dataset.cgptHelperChatTracked = "1";
    return;
  }

  chatLogTrackedIds.add(entryId);
  el.dataset.cgptHelperChatTracked = "1";

  const entry = {
    id: entryId,
    role,
    text: extractChatMessageText(el),
    timestamp: extractChatMessageTimestamp(el),
    element: el,
    order: chatLogOrderCounter++,
  };

  chatLogEntries.push(entry);
  renderChatMessageTimestamp(entry);
  renderChatMessageFolding(entry);
}

function extractChatMessageTimestamp(el) {
  const timeEl = el.querySelector("time");
  if (timeEl) {
    const dt =
      timeEl.getAttribute("datetime") ||
      timeEl.dateTime ||
      (timeEl.textContent ? timeEl.textContent.trim() : "");
    if (dt) return dt;
  }
  return new Date().toISOString();
}

function renderChatMessageTimestamp(entry) {
  if (!entry || !entry.element) return;
  ensureChatLogTimestampStyle();
  const container = entry.element.querySelector(
    ".cgpt-helper-chatlog-timestamp-wrapper"
  );
  const labelText =
    typeof cgptFormatChatLogTimestamp === "function"
      ? cgptFormatChatLogTimestamp(entry.timestamp)
      : entry.timestamp;

  if (container) {
    const label = container.querySelector(".cgpt-helper-chatlog-timestamp-label");
    if (label) {
      label.textContent = labelText;
    }
    if (entry.element.firstChild !== container) {
      entry.element.insertBefore(container, entry.element.firstChild);
    }
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "cgpt-helper-chatlog-timestamp-wrapper";

  const label = document.createElement("span");
  label.className = "cgpt-helper-chatlog-timestamp-label";
  label.textContent = labelText;
  wrapper.appendChild(label);

  entry.element.insertBefore(wrapper, entry.element.firstChild);
}

function renderChatMessageFolding(entry) {
  if (!entry || !entry.element) return;
  if (entry.element.dataset.cgptHelperFoldApplied === "1") return;

  const messageElement = entry.element;
  ensureChatLogFoldStyle();

  const timestampNode = messageElement.querySelector(".cgpt-helper-chatlog-timestamp-wrapper");
  const movableNodes = Array.from(messageElement.childNodes).filter((node) => node !== timestampNode);
  if (!movableNodes.length) return;

  const fold = cgptCreateFoldSection({
    title: "",
    initiallyOpen: true,
    level: 0,
    badgeText: cgptGetChatEntryDisplayLabel(entry),
    actions: cgptBuildChatFoldActions(entry),
  });

  if (timestampNode) {
    fold.titleWrapper.appendChild(timestampNode);
  }

  const body = fold.body;
  body.classList.add("cgpt-helper-message-body");
  movableNodes.forEach((node) => body.appendChild(node));

  messageElement.insertBefore(fold.container, messageElement.firstChild);

  entry.element.dataset.cgptHelperFoldApplied = "1";
  if (entry.role === "assistant" && cgptShouldApplyHeadingFold(body)) {
    applyHeadingFold(body, 1);
  }
}

function cgptGetChatEntryDisplayLabel(entry) {
  if (!entry) return "";
  if (entry.role === "user") {
    return "User";
  }
  const element = entry.element;
  const candidates = [
    element && element.getAttribute ? element.getAttribute("data-message-model-slug") : "",
    element && element.getAttribute ? element.getAttribute("data-message-model-name") : "",
    element && element.getAttribute ? element.getAttribute("data-model-slug") : "",
    element && element.getAttribute ? element.getAttribute("data-model-name") : "",
    element && element.dataset ? element.dataset.messageModelSlug : "",
    element && element.dataset ? element.dataset.messageModelName : "",
    element && element.dataset ? element.dataset.modelSlug : "",
    element && element.dataset ? element.dataset.modelName : "",
  ];
  for (const candidate of candidates) {
    const normalized = cgptNormalizeChatEntryDisplayLabel(candidate);
    if (normalized) {
      return normalized;
    }
  }
  return "AI";
}

function cgptNormalizeChatEntryDisplayLabel(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";

  const slugMatch = text.match(/^gpt-(\d+)(?:-(\d+))?(?:-(.+))?$/i);
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

  const cleaned = text.replace(/^chatgpt\s*/i, "").trim();
  return cleaned || "";
}

function cgptShouldApplyHeadingFold(root) {
  if (!root || !(root.querySelectorAll instanceof Function)) return false;
  const headings = Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  return headings.length > 0;
}

function cgptGetHeadingLevel(headingElement) {
  const tag = headingElement && headingElement.tagName ? headingElement.tagName.toUpperCase() : "";
  const match = tag.match(/^H(\d)$/);
  if (!match) return 0;
  const level = Number.parseInt(match[1], 10);
  return Number.isFinite(level) ? level : 0;
}

function cgptCollectHeadingSectionNodes(heading, nextHeading) {
  if (!heading || !heading.parentNode) return [];
  const nodes = [];
  let cursor = heading.nextSibling;
  while (cursor && cursor !== nextHeading) {
    nodes.push(cursor);
    cursor = cursor.nextSibling;
  }
  return nodes;
}

function cgptSetHeadingFoldOpen(heading, isOpen) {
  if (!heading) return;
  const open = isOpen !== false;
  heading.dataset.cgptHelperFoldOpen = open ? "1" : "0";
  heading.classList.toggle("cgpt-helper-heading-collapsed", !open);

  const toggleButton = heading.querySelector(".cgpt-helper-heading-toggle");
  if (toggleButton) {
    toggleButton.setAttribute("aria-expanded", open ? "true" : "false");
    toggleButton.setAttribute("aria-label", open ? "Collapse section" : "Expand section");
    toggleButton.title = open ? "Collapse section" : "Expand section";
  }
}

function cgptRefreshHeadingFoldVisibility(root) {
  if (!root || !(root.querySelectorAll instanceof Function)) return;
  const sections = Array.from(root.querySelectorAll(".cgpt-helper-heading-section"));
  const collapsedStack = [];

  sections.forEach((section) => {
    const heading = section.querySelector(".cgpt-helper-heading-fold");
    const body = section.querySelector(".cgpt-helper-heading-body");
    if (!heading) return;
    const level = Number.parseInt(heading.dataset.cgptHelperFoldLevel || "0", 10);
    if (!Number.isFinite(level) || level < 1) return;

    while (collapsedStack.length && collapsedStack[collapsedStack.length - 1].level >= level) {
      collapsedStack.pop();
    }

    const hiddenByAncestor = collapsedStack.length > 0;
    const isOpen = heading.dataset.cgptHelperFoldOpen !== "0";
    section.classList.toggle("cgpt-helper-heading-section-hidden", hiddenByAncestor);
    if (body) {
      body.classList.toggle("cgpt-helper-heading-section-hidden", !hiddenByAncestor && !isOpen);
    }

    if (!hiddenByAncestor && !isOpen) {
      collapsedStack.push({ level });
    }
  });
}

function applyHeadingFold(root, baseLevel = 0) {
  if (!root || !(root.querySelectorAll instanceof Function)) return;
  const headings = Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  if (!headings.length) return;

  const headingStack = [];

  headings.forEach((heading, index) => {
    if (heading.dataset.cgptHelperHeadingFoldApplied === "1") return;

    const level = cgptGetHeadingLevel(heading);
    if (!level) return;

    while (headingStack.length && headingStack[headingStack.length - 1] >= level) {
      headingStack.pop();
    }
    const parentVisualDepth = headingStack.length;
    const visualLevel = headingStack.length + 1;
    headingStack.push(level);

    const nextHeading = (() => {
      for (let i = index + 1; i < headings.length; i += 1) {
        if (cgptGetHeadingLevel(headings[i]) <= level) {
          return headings[i];
        }
      }
      return null;
    })();

    const headingId = `heading-${baseLevel}-${index}`;
    const sectionNodes = cgptCollectHeadingSectionNodes(heading, nextHeading);
    const section = document.createElement("section");
    const body = document.createElement("div");
    const guide = document.createElement("div");

    section.className = "cgpt-helper-heading-section";
    body.className = "cgpt-helper-heading-body";
    guide.className = "cgpt-helper-heading-guide";

    heading.dataset.cgptHelperHeadingId = headingId;
    heading.dataset.cgptHelperHeadingFoldApplied = "1";
    heading.classList.add("cgpt-helper-heading-fold", "cgpt-helper-heading-title");
    section.style.setProperty("--cgpt-helper-fold-visual-level", `${visualLevel}`);
    section.style.setProperty("--cgpt-helper-fold-guide-count", `${level}`);
    section.style.setProperty("--cgpt-helper-fold-level", `${visualLevel}`);
    section.style.setProperty(
      "--cgpt-helper-fold-indent",
      `${visualLevel > 1 ? CGPT_FOLD_INDENT_STEP_PX : 0}px`
    );
    section.style.setProperty("--cgpt-helper-fold-color", cgptGetFoldLevelColor(level));

    heading.style.setProperty("--cgpt-helper-fold-visual-level", `${visualLevel}`);
    heading.style.setProperty("--cgpt-helper-fold-guide-count", `${level}`);
    heading.style.setProperty(
      "--cgpt-helper-fold-indent",
      `${visualLevel > 1 ? CGPT_FOLD_INDENT_STEP_PX : 0}px`
    );
    heading.style.setProperty("--cgpt-helper-fold-color", cgptGetFoldLevelColor(level));
    heading.dataset.cgptHelperFoldLevel = `${level}`;
    guide.dataset.cgptHelperFoldDepth = `${parentVisualDepth}`;
    guide.dataset.cgptHelperFoldLevel = `${level}`;

    if (!heading.querySelector(":scope > .cgpt-helper-heading-toggle")) {
      const toggleButton = document.createElement("button");
      toggleButton.type = "button";
      toggleButton.className = "cgpt-helper-heading-toggle";
      toggleButton.dataset.cgptHelperFoldAction = "toggle";
      heading.insertBefore(toggleButton, heading.firstChild);
      toggleButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const nextOpen = heading.dataset.cgptHelperFoldOpen === "0";
        cgptSetHeadingFoldOpen(heading, nextOpen);
        cgptRefreshHeadingFoldVisibility(root);
      });
    }

    heading.parentNode.insertBefore(section, heading);
    section.appendChild(guide);
    section.appendChild(heading);
    section.appendChild(body);
    sectionNodes.forEach((node) => body.appendChild(node));

    cgptSetHeadingFoldOpen(heading, true);
  });

  cgptRefreshHeadingFoldVisibility(root);
}

function cgptFindHeadingFolds() {
  if (!document || typeof document.querySelectorAll !== "function") return [];
  return Array.from(document.querySelectorAll(".cgpt-helper-heading-fold"));
}

function cgptToggleHeadingFoldsAtLevel(level, shouldExpand = true) {
  const parsed = Number.parseInt(level, 10);
  if (!Number.isFinite(parsed)) return;
  const targetLevel = Math.min(Math.max(parsed, 1), 6);
  const affectedRoots = new Set();
  cgptFindHeadingFolds().forEach((fold) => {
    const foldLevel = Number.parseInt(fold.dataset.cgptHelperFoldLevel, 10);
    if (foldLevel === targetLevel) {
      cgptSetHeadingFoldOpen(fold, shouldExpand);
      const root = fold.closest(".cgpt-helper-message-body");
      if (root) {
        affectedRoots.add(root);
      }
    }
  });
  affectedRoots.forEach((root) => cgptRefreshHeadingFoldVisibility(root));
}

function ensureChatLogFoldStyle() {
  if (chatLogFoldStyleInjected) return;
  const style = document.createElement("style");
  style.textContent = `
    .cgpt-helper-fold {
      position: relative;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 10px;
      padding: 10px 10px 10px 14px;
      margin-top: 10px;
      background: transparent;
      color: inherit;
      width: 100%;
    }
    .cgpt-helper-fold-nested {
      padding-left: calc(${CGPT_FOLD_CONTENT_LEFT_BASE_PX}px + var(--cgpt-helper-fold-indent, 0px));
    }
    .cgpt-helper-fold-nested::before {
      content: "";
      position: absolute;
      top: 8px;
      bottom: 8px;
      left: calc(${CGPT_FOLD_LINE_LEFT_BASE_PX}px + var(--cgpt-helper-fold-line-offset, 0px));
      width: ${CGPT_FOLD_LINE_WIDTH_PX}px;
      background: var(--cgpt-helper-fold-color, rgba(124, 58, 237, 0.65));
      border-radius: 999px;
      pointer-events: none;
    }
    .cgpt-helper-fold-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      width: 100%;
    }
    .cgpt-helper-fold-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
      color: inherit;
    }
    .cgpt-helper-fold-title-text {
      display: inline-flex;
      align-items: center;
      color: inherit;
    }
    .cgpt-helper-fold-title-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: ${CGPT_FOLD_CHIP_MIN_HEIGHT_PX}px;
      padding: ${CGPT_FOLD_CHIP_PADDING};
      font-size: ${CGPT_FOLD_CHIP_FONT_SIZE_PX}px;
      line-height: 1;
      border-radius: ${CGPT_FOLD_CHIP_RADIUS};
      border: 1px solid rgba(148, 163, 184, 0.52);
      background: rgba(241, 245, 249, 0.92);
      color: #334155;
      box-sizing: border-box;
      white-space: nowrap;
    }
    .cgpt-helper-fold-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .cgpt-helper-fold-action-button {
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      border: 1px solid rgba(148, 163, 184, 0.52);
      background: rgba(241, 245, 249, 0.92);
      color: #334155;
      min-width: 0;
      transition: transform 0.1s ease, opacity 0.2s ease;
    }
    .cgpt-helper-fold-action-button:hover:not(.cgpt-helper-fold-action-disabled) {
      transform: translateY(-1px);
    }
    .cgpt-helper-fold-action-disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .cgpt-helper-fold-toggle {
      background: rgba(241, 245, 249, 0.92);
      border-color: rgba(148, 163, 184, 0.52);
      color: #334155;
    }
    .cgpt-helper-fold-toggle.cgpt-helper-fold-action-disabled {
      opacity: 0.6;
    }
    .cgpt-helper-fold-body {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      color: inherit;
    }
    .cgpt-helper-fold-collapsed .cgpt-helper-fold-body {
      display: none;
    }
    .cgpt-helper-heading-title {
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
      padding-left: calc(20px + ${CGPT_FOLD_GUIDE_STEP_PX}px);
      color: inherit;
    }
    .cgpt-helper-heading-section {
      position: relative;
      margin: 2px 0;
    }
    .cgpt-helper-heading-fold {
      margin: 0;
    }
    .cgpt-helper-heading-body {
      padding-left: 0;
    }
    .cgpt-helper-heading-body > * {
      margin-top: 0;
    }
    .cgpt-helper-heading-body > * + * {
      margin-top: 8px;
    }
    .cgpt-helper-heading-body > .cgpt-helper-heading-section {
      margin-left: ${CGPT_FOLD_GUIDE_STEP_PX}px;
    }
    .cgpt-helper-heading-body > :not(.cgpt-helper-heading-section) {
      margin-left: ${CGPT_FOLD_GUIDE_STEP_PX}px;
      padding-left: 20px;
    }
    .cgpt-helper-heading-guide {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: ${CGPT_FOLD_LINE_WIDTH_PX}px;
      background: var(--cgpt-helper-fold-color, rgba(124, 58, 237, 0.65));
      border-radius: 999px;
      pointer-events: none;
    }
    .cgpt-helper-heading-toggle {
      position: relative;
      flex: 0 0 auto;
      width: 14px;
      height: 14px;
      margin: 0;
      padding: 0;
      border: none;
      background: transparent;
      color: inherit;
      cursor: pointer;
    }
    .cgpt-helper-heading-toggle::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      width: 7px;
      height: 7px;
      border-right: 2px solid var(--cgpt-helper-fold-color, currentColor);
      border-bottom: 2px solid var(--cgpt-helper-fold-color, currentColor);
      transform: translate(-50%, -60%) rotate(45deg);
      transition: transform 0.15s ease;
    }
    .cgpt-helper-heading-collapsed .cgpt-helper-heading-toggle::before {
      transform: translate(-40%, -50%) rotate(-45deg);
    }
    .cgpt-helper-heading-section-hidden {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
  chatLogFoldStyleInjected = true;
}

function extractChatMessageText(el) {
  if (!el) return "";
  if (el.innerText) return el.innerText.trim();
  if (el.textContent) return el.textContent.trim();
  return "";
}

function getChatLogEntries() {
  return chatLogEntries
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((entry) => ({ ...entry }));
}
function highlightChatMessageElement(el) {
  if (!el || typeof el.scrollIntoView !== "function") return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("cgpt-helper-chatlog-highlight");
  setTimeout(() => {
    el.classList.remove("cgpt-helper-chatlog-highlight");
  }, 2000);
}
