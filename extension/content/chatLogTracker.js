const CHAT_LOG_SELECTOR = "[data-message-author-role]";
const chatLogEntries = [];
const chatLogTrackedIds = new Set();
let chatLogOrderCounter = 0;
let chatLogTrackerInitialized = false;
let chatLogRouteWatcher = null;
let chatLogHighlightStyleInjected = false;
let chatLogTimestampStyleInjected = false;
let chatLogFoldStyleInjected = false;
let currentConversationKey = null;
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
const CGPT_FOLD_LINE_LEFT_BASE_PX = 8;
const CGPT_FOLD_CONTENT_LEFT_BASE_PX = 18;
const CGPT_FOLD_LINE_WIDTH_PX = 1;

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
  if (typeof cgptSetSharedButtonCustomPalette === "function") {
    cgptSetSharedButtonCustomPalette(button, {
      background: "var(--cgpt-helper-fold-color, #7c3aed)",
      hoverBackground: "var(--cgpt-helper-fold-color, #7c3aed)",
      activeBackground: "var(--cgpt-helper-fold-color, #7c3aed)",
      border: "var(--cgpt-helper-fold-color, #7c3aed)",
      hoverBorder: "var(--cgpt-helper-fold-color, #7c3aed)",
      activeBorder: "var(--cgpt-helper-fold-color, #7c3aed)",
      color: "#0b172a",
      focusRing: "rgba(255, 255, 255, 0.72)",
    });
    return;
  }
  button.style.background = "var(--cgpt-helper-fold-color, #7c3aed)";
  button.style.borderColor = "var(--cgpt-helper-fold-color, #7c3aed)";
  button.style.color = "#0b172a";
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
  const titleText = document.createElement("span");
  titleText.className = "cgpt-helper-fold-title-text";
  titleText.textContent = title || "";
  titleWrapper.appendChild(titleText);
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
  return button;
}

function cgptBuildChatFoldActions(entry) {
  const textSupplier = () => (entry && entry.text ? entry.text : "");
  const canSave = entry && entry.role === "assistant";
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

function initChatLogTracker() {
  if (chatLogTrackerInitialized) return;
  chatLogTrackerInitialized = true;
  ensureChatLogHighlightStyle();
  currentConversationKey = getConversationKey();
  captureChatLogsFromNode(document);
  startChatRouteWatcher();
}

function startChatRouteWatcher() {
  if (chatLogRouteWatcher) return;
  chatLogRouteWatcher = setInterval(() => {
    const key = getConversationKey();
    if (key !== currentConversationKey) {
      currentConversationKey = key;
      resetChatLogEntries();
      captureChatLogsFromNode(document);
    }
  }, 1000);
}

function getConversationKey() {
  return window.location ? window.location.pathname + window.location.search : "";
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
      justify-content: flex-end;
      margin-bottom: 6px;
      width: 100%;
    }
    .cgpt-helper-chatlog-timestamp-label {
      font-size: 12px;
      color: #9ca3af;
      background: rgba(17, 24, 39, 0.75);
      border: 1px solid #374151;
      border-radius: 12px;
      padding: 4px 10px;
      line-height: 1.4;
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
    title: entry.role === "assistant" ? "Response" : "Message",
    initiallyOpen: true,
    level: 0,
    badgeText: entry.role === "assistant" ? "AI" : "USER",
    actions: cgptBuildChatFoldActions(entry),
  });

  const body = fold.body;
  body.classList.add("cgpt-helper-message-body");
  movableNodes.forEach((node) => body.appendChild(node));

  if (timestampNode && timestampNode.parentNode === messageElement) {
    messageElement.insertBefore(fold.container, timestampNode.nextSibling);
  } else {
    messageElement.insertBefore(fold.container, messageElement.firstChild);
  }

  entry.element.dataset.cgptHelperFoldApplied = "1";
  if (entry.role === "assistant" && cgptShouldApplyHeadingFold(body)) {
    applyHeadingFold(body, 1);
  }
}

function cgptShouldApplyHeadingFold(root) {
  if (!root || !(root.querySelectorAll instanceof Function)) return false;
  const headings = Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  return headings.length > 0;
}

function applyHeadingFold(root, baseLevel = 0) {
  if (!root || !(root.querySelectorAll instanceof Function)) return;
  const headings = Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  if (!headings.length) return;

  const getLevel = (headingElement) => {
    const tag = headingElement && headingElement.tagName ? headingElement.tagName.toUpperCase() : "";
    const match = tag.match(/^H(\d)$/);
    if (!match) return 0;
    const level = Number.parseInt(match[1], 10);
    return Number.isFinite(level) ? level : 0;
  };

  const headingStack = [];

  headings.forEach((heading, index) => {
    const level = getLevel(heading);
    if (!level) return;

    while (headingStack.length && headingStack[headingStack.length - 1] >= level) {
      headingStack.pop();
    }
    const visualLevel = baseLevel + headingStack.length + 1;
    headingStack.push(level);

    const nextHeading = (() => {
      for (let i = index + 1; i < headings.length; i += 1) {
        if (getLevel(headings[i]) <= level) {
          return headings[i];
        }
      }
      return null;
    })();

    const headingFold = cgptCreateFoldSection({
      title: heading.textContent || "(untitled)",
      initiallyOpen: true,
      level,
      visualLevel,
      badgeText: "",
      actions: { showSave: false, showSaveAs: false, showCopy: false },
    });

    headingFold.container.classList.add("cgpt-helper-heading-fold");
    headingFold.body.classList.add("cgpt-helper-heading-content");

    const headingClone = heading.cloneNode(true);
    headingClone.classList.add("cgpt-helper-heading-title");
    headingClone.style.margin = "0";
    headingClone.style.padding = "0";
    headingClone.style.display = "inline-flex";
    headingClone.style.alignItems = "center";
    headingClone.style.color = "inherit";

    const fallbackText = headingFold.titleWrapper.querySelector(".cgpt-helper-fold-title-text");
    if (fallbackText) {
      fallbackText.remove();
    }
    headingFold.titleWrapper.appendChild(headingClone);

    const range = heading.ownerDocument.createRange();
    try {
      range.setStartAfter(heading);
      if (nextHeading) {
        range.setEndBefore(nextHeading);
      } else if (heading.parentNode && heading.parentNode.lastChild) {
        range.setEndAfter(heading.parentNode.lastChild);
      } else {
        range.setEndAfter(heading);
      }
      const extracted = range.extractContents();
      headingFold.body.appendChild(extracted);
    } catch (e) {
      // noop
    } finally {
      if (typeof range.detach === "function") {
        range.detach();
      }
    }

    heading.replaceWith(headingFold.container);
  });
}

function cgptFindHeadingFolds() {
  if (!document || typeof document.querySelectorAll !== "function") return [];
  return Array.from(document.querySelectorAll(".cgpt-helper-heading-fold"));
}

function cgptToggleHeadingFoldsAtLevel(level, shouldExpand = true) {
  const parsed = Number.parseInt(level, 10);
  if (!Number.isFinite(parsed)) return;
  const targetLevel = Math.min(Math.max(parsed, 1), 6);
  cgptFindHeadingFolds().forEach((fold) => {
    const foldLevel = Number.parseInt(fold.dataset.cgptHelperFoldLevel, 10);
    if (foldLevel === targetLevel) {
      cgptApplyFoldState(fold, shouldExpand);
    }
  });
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
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.16);
      background: rgba(255, 255, 255, 0.05);
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
      font-size: 11px;
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: #4b5563;
      color: #f9fafb;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25);
      min-width: 70px;
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
      background: var(--cgpt-helper-fold-color, #7c3aed);
      border-color: var(--cgpt-helper-fold-color, #7c3aed);
      color: #0b172a;
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
    .cgpt-helper-heading-fold {
      padding-top: 8px;
      padding-bottom: 8px;
    }
    .cgpt-helper-heading-fold .cgpt-helper-fold-title {
      font-size: inherit;
      font-weight: inherit;
    }
    .cgpt-helper-heading-content {
      font-size: inherit;
      line-height: inherit;
      color: inherit;
    }
    .cgpt-helper-heading-title {
      margin: 0;
      padding: 0;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: inherit;
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
