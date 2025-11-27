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
  renderAssistantMessageFolding(entry);
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

function renderAssistantMessageFolding(entry) {
  if (!entry || entry.role !== "assistant" || !entry.element) return;
  if (entry.element.dataset.cgptHelperFoldApplied === "1") return;

  const messageElement = entry.element;
  ensureChatLogFoldStyle();

  const timestampNode = messageElement.querySelector(".cgpt-helper-chatlog-timestamp-wrapper");
  const movableNodes = Array.from(messageElement.childNodes).filter((node) => node !== timestampNode);
  if (!movableNodes.length) return;

  const wrapper = document.createElement("details");
  wrapper.className = "cgpt-helper-response-fold";
  wrapper.open = true;

  const summary = document.createElement("summary");
  summary.className = "cgpt-helper-response-summary";
  summary.textContent = "応答を表示/非表示";
  wrapper.appendChild(summary);

  const body = document.createElement("div");
  body.className = "cgpt-helper-response-body";
  movableNodes.forEach((node) => body.appendChild(node));
  wrapper.appendChild(body);

  if (timestampNode && timestampNode.parentNode === messageElement) {
    messageElement.insertBefore(wrapper, timestampNode.nextSibling);
  } else {
    messageElement.insertBefore(wrapper, messageElement.firstChild);
  }

  entry.element.dataset.cgptHelperFoldApplied = "1";
  applyHeadingFold(body);
}

function applyHeadingFold(root) {
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

    const details = heading.ownerDocument.createElement("details");
    details.className = "cgpt-helper-heading-fold";
    details.open = level <= 2;

    const summary = heading.ownerDocument.createElement("summary");
    summary.className = "cgpt-helper-heading-summary";
    summary.textContent = heading.textContent || "(untitled)";
    details.appendChild(summary);

    const content = heading.ownerDocument.createElement("div");
    content.className = "cgpt-helper-heading-content";

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
      content.appendChild(extracted);
    } catch (e) {
      // noop
    } finally {
      if (typeof range.detach === "function") {
        range.detach();
      }
    }

    details.appendChild(content);
    heading.replaceWith(details);
  });
}

function ensureChatLogFoldStyle() {
  if (chatLogFoldStyleInjected) return;
  const style = document.createElement("style");
  style.textContent = `
    .cgpt-helper-response-fold {
      border: 1px solid #374151;
      border-radius: 10px;
      padding: 8px;
      background: rgba(17, 24, 39, 0.6);
      margin-top: 8px;
    }
    .cgpt-helper-response-summary {
      cursor: pointer;
      font-size: 12px;
      color: #e5e7eb;
      list-style: none;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .cgpt-helper-response-body {
      margin-top: 6px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .cgpt-helper-heading-fold {
      border: 1px solid #4b5563;
      border-radius: 8px;
      padding: 6px;
      margin-top: 6px;
      background: rgba(15, 23, 42, 0.55);
    }
    .cgpt-helper-heading-summary {
      cursor: pointer;
      font-size: 12px;
      color: #c7d2fe;
      list-style: none;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .cgpt-helper-heading-content {
      margin-top: 6px;
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
