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

function cgptCreateFoldSection({ title, initiallyOpen = true, level = 0, badgeText = "" }) {
  const fold = document.createElement("div");
  fold.className = "cgpt-helper-fold";
  const parsedLevel = Number.parseInt(level, 10);
  const numericLevel = Number.isFinite(parsedLevel) ? Math.max(0, parsedLevel) : 0;
  if (numericLevel > 0) {
    fold.classList.add("cgpt-helper-fold-nested");
    fold.style.setProperty("--cgpt-helper-fold-level", `${Math.min(numericLevel, 6)}`);
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
  titleText.textContent = title || "";
  titleWrapper.appendChild(titleText);
  header.appendChild(titleWrapper);

  const actions = document.createElement("div");
  actions.className = "cgpt-helper-fold-actions";
  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.className = "cgpt-helper-fold-toggle";
  actions.appendChild(toggleButton);
  header.appendChild(actions);
  fold.appendChild(header);

  const body = document.createElement("div");
  body.className = "cgpt-helper-fold-body";
  fold.appendChild(body);

  let isOpen = initiallyOpen !== false;
  const syncState = () => {
    fold.classList.toggle("cgpt-helper-fold-collapsed", !isOpen);
    toggleButton.textContent = isOpen ? "折りたたむ" : "展開する";
    toggleButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
    toggleButton.setAttribute("aria-label", `${title || "セクション"}を${isOpen ? "折りたたむ" : "展開"}`);
  };
  toggleButton.addEventListener("click", () => {
    isOpen = !isOpen;
    syncState();
  });
  syncState();

  return { container: fold, body, titleWrapper };
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
    title: entry.role === "assistant" ? "応答" : "チャットメッセージ",
    initiallyOpen: true,
    level: 0,
    badgeText: entry.role === "assistant" ? "AI" : "USER",
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
  if (entry.role === "assistant") {
    applyHeadingFold(body, 1);
  }
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

  headings.forEach((heading, index) => {
    const level = getLevel(heading);
    if (!level) return;

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
      initiallyOpen: level <= 2,
      level: baseLevel + Math.max(0, level - 1),
      badgeText: `H${level}`,
    });

    headingFold.container.classList.add("cgpt-helper-heading-fold");
    headingFold.body.classList.add("cgpt-helper-heading-content");

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

function ensureChatLogFoldStyle() {
  if (chatLogFoldStyleInjected) return;
  const style = document.createElement("style");
  style.textContent = `
    .cgpt-helper-fold {
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 10px;
      padding: 10px;
      margin-top: 10px;
      background: transparent;
      color: inherit;
      width: 100%;
    }
    .cgpt-helper-fold-nested {
      margin-left: calc(var(--cgpt-helper-fold-level, 1) * 10px);
      box-shadow: inset 2px 0 0 rgba(124, 58, 237, 0.35);
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
    .cgpt-helper-fold-toggle {
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(55, 65, 81, 0.8);
      color: #f9fafb;
    }
    .cgpt-helper-fold-toggle:hover {
      background: rgba(75, 85, 99, 0.9);
    }
    .cgpt-helper-fold-toggle::before {
      content: '▸';
      display: inline-block;
      transition: transform 0.15s ease;
      font-size: 10px;
    }
    .cgpt-helper-fold-collapsed .cgpt-helper-fold-toggle::before {
      transform: rotate(0deg);
    }
    .cgpt-helper-fold:not(.cgpt-helper-fold-collapsed) .cgpt-helper-fold-toggle::before {
      transform: rotate(90deg);
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
    .cgpt-helper-heading-content {
      font-size: 12px;
      line-height: 1.6;
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
