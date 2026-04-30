const CHAT_LOG_SELECTOR = "[data-message-author-role]";
const chatLogEntries = [];
const chatLogTrackedIds = new Set();
const chatLogPendingFoldTimers = new Map();
let chatLogOrderCounter = 0;
let chatLogTrackerInitialized = false;
let chatLogHighlightStyleInjected = false;
let chatLogTimestampStyleInjected = false;
let cgptChatTimestampStoreLoaded = false;
let cgptChatTimestampStore = {};
let cgptActiveConversationTimestampKey = "";
let cgptActiveConversationTimestampEntries = [];
let cgptChatTimestampPersistTimer = null;
const CHAT_LOG_FOLD_DELAY_MS = 120;
const CHAT_LOG_FOLD_MAX_RETRIES = 8;
const CHAT_LOG_FOLD_QUIET_PERIOD_MS = 1200;
const CGPT_CHAT_TIMESTAMP_STORAGE_KEY = "cgptHelper.chatMessageTimeline";
const CGPT_CHAT_TIMESTAMP_CONVERSATION_LIMIT = 50;
const CGPT_CHAT_TIMESTAMP_ENTRY_LIMIT = 300;

function cgptCanUseChatTimestampStorage() {
  return Boolean(
    typeof chrome !== "undefined" &&
      chrome.storage &&
      chrome.storage.local &&
      typeof chrome.storage.local.get === "function" &&
      typeof chrome.storage.local.set === "function"
  );
}

function cgptHashChatMessageText(text) {
  const normalized = cgptNormalizePlainText(text).trim();
  if (!normalized) return "";
  let hash = 2166136261;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function cgptNormalizeConversationTimestampEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const timestamp = typeof entry.timestamp === "string" ? entry.timestamp.trim() : "";
  if (!timestamp) return null;
  const numericOrder = Number.parseInt(entry.order, 10);
  return {
    messageId: typeof entry.messageId === "string" ? entry.messageId : "",
    role: typeof entry.role === "string" ? entry.role : "",
    order: Number.isFinite(numericOrder) ? numericOrder : -1,
    textHash: typeof entry.textHash === "string" ? entry.textHash : "",
    timestamp,
    capturedAt: typeof entry.capturedAt === "string" ? entry.capturedAt : "",
    updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : "",
  };
}

function cgptNormalizeConversationTimestampBucket(bucket) {
  const entries = Array.isArray(bucket && bucket.entries)
    ? bucket.entries
        .map((entry) => cgptNormalizeConversationTimestampEntry(entry))
        .filter(Boolean)
        .slice(-CGPT_CHAT_TIMESTAMP_ENTRY_LIMIT)
    : [];
  return {
    updatedAt: typeof (bucket && bucket.updatedAt) === "string" ? bucket.updatedAt : "",
    entries,
  };
}

function cgptTrimChatTimestampStore(store) {
  const normalizedEntries = Object.entries(store || {}).map(([conversationKey, bucket]) => [
    conversationKey,
    cgptNormalizeConversationTimestampBucket(bucket),
  ]);
  normalizedEntries.sort((left, right) => {
    const leftTime = Date.parse(left[1].updatedAt || "") || 0;
    const rightTime = Date.parse(right[1].updatedAt || "") || 0;
    return leftTime - rightTime;
  });
  return normalizedEntries.slice(-CGPT_CHAT_TIMESTAMP_CONVERSATION_LIMIT).reduce((acc, [key, bucket]) => {
    acc[key] = bucket;
    return acc;
  }, {});
}

function cgptLoadChatTimestampStore(callback = () => {}) {
  if (cgptChatTimestampStoreLoaded) {
    callback(cgptChatTimestampStore);
    return;
  }
  if (!cgptCanUseChatTimestampStorage()) {
    cgptChatTimestampStoreLoaded = true;
    cgptChatTimestampStore = {};
    callback(cgptChatTimestampStore);
    return;
  }
  const finalizeWith = (rawStore) => {
    const normalizedStore = {};
    Object.entries(rawStore || {}).forEach(([conversationKey, bucket]) => {
      normalizedStore[conversationKey] = cgptNormalizeConversationTimestampBucket(bucket);
    });
    cgptChatTimestampStoreLoaded = true;
    cgptChatTimestampStore = cgptTrimChatTimestampStore(normalizedStore);
    callback(cgptChatTimestampStore);
  };
  const invokeLoad = () => {
    chrome.storage.local.get([CGPT_CHAT_TIMESTAMP_STORAGE_KEY], (result) => {
      if (chrome.runtime && chrome.runtime.lastError) {
        finalizeWith({});
        return;
      }
      const rawStore =
        result &&
        result[CGPT_CHAT_TIMESTAMP_STORAGE_KEY] &&
        typeof result[CGPT_CHAT_TIMESTAMP_STORAGE_KEY] === "object"
          ? result[CGPT_CHAT_TIMESTAMP_STORAGE_KEY]
          : {};
      finalizeWith(rawStore);
    });
  };
  if (typeof cgptInvokeExtensionApi === "function") {
    cgptInvokeExtensionApi(invokeLoad, () => finalizeWith({}));
    return;
  }
  try {
    invokeLoad();
  } catch (error) {
    if (typeof cgptIsExtensionContextInvalidatedError === "function" &&
      cgptIsExtensionContextInvalidatedError(error)) {
      finalizeWith({});
      return;
    }
    throw error;
  }
}

function cgptSetActiveConversationTimestampCache(conversationKey) {
  const normalizedKey = String(conversationKey || "");
  cgptActiveConversationTimestampKey = normalizedKey;
  const bucket = cgptChatTimestampStore[normalizedKey];
  cgptActiveConversationTimestampEntries = bucket && Array.isArray(bucket.entries) ? bucket.entries : [];
}

function cgptPrepareChatTimestampCache(conversationKey, callback = () => {}) {
  cgptLoadChatTimestampStore(() => {
    cgptSetActiveConversationTimestampCache(conversationKey);
    callback();
  });
}

function cgptFindCachedChatTimestampEntry(entries, criteria = {}) {
  const normalizedEntries = Array.isArray(entries) ? entries : [];
  const messageId = typeof criteria.messageId === "string" ? criteria.messageId : "";
  const role = typeof criteria.role === "string" ? criteria.role : "";
  const numericOrder = Number.parseInt(criteria.order, 10);
  const order = Number.isFinite(numericOrder) ? numericOrder : -1;
  const textHash = typeof criteria.textHash === "string" ? criteria.textHash : "";

  if (messageId) {
    const exactMessageMatch = normalizedEntries.find((entry) => entry && entry.messageId === messageId);
    if (exactMessageMatch) {
      return exactMessageMatch;
    }
  }
  if (role && order >= 0) {
    const orderMatch = normalizedEntries.find(
      (entry) => entry && entry.role === role && entry.order === order
    );
    if (orderMatch) {
      return orderMatch;
    }
  }
  if (role && textHash) {
    return (
      normalizedEntries.find(
        (entry) => entry && entry.role === role && entry.textHash === textHash
      ) || null
    );
  }
  return null;
}

function cgptResolveCachedChatTimestamp(criteria = {}) {
  const textHash =
    typeof criteria.textHash === "string" && criteria.textHash
      ? criteria.textHash
      : cgptHashChatMessageText(criteria.text || "");
  const match = cgptFindCachedChatTimestampEntry(cgptActiveConversationTimestampEntries, {
    messageId: criteria.messageId || "",
    role: criteria.role || "",
    order: criteria.order,
    textHash,
  });
  return match && match.timestamp ? match.timestamp : "";
}

function cgptUpsertConversationTimestampEntry(entries, entry) {
  const normalizedEntry = cgptNormalizeConversationTimestampEntry(entry);
  if (!normalizedEntry) {
    return Array.isArray(entries) ? entries.slice() : [];
  }
  const nextEntries = Array.isArray(entries) ? entries.slice() : [];
  const existing = cgptFindCachedChatTimestampEntry(nextEntries, normalizedEntry);
  const existingIndex = existing ? nextEntries.indexOf(existing) : -1;
  if (existingIndex >= 0) {
    const mergedEntry = {
      ...existing,
      ...normalizedEntry,
      capturedAt: existing.capturedAt || normalizedEntry.capturedAt,
    };
    nextEntries.splice(existingIndex, 1);
    nextEntries.push(mergedEntry);
  } else {
    nextEntries.push(normalizedEntry);
  }
  return nextEntries.slice(-CGPT_CHAT_TIMESTAMP_ENTRY_LIMIT);
}

function cgptScheduleChatTimestampStorePersist() {
  if (!cgptCanUseChatTimestampStorage()) {
    return;
  }
  if (cgptChatTimestampPersistTimer) {
    clearTimeout(cgptChatTimestampPersistTimer);
  }
  cgptChatTimestampPersistTimer = setTimeout(() => {
    cgptChatTimestampPersistTimer = null;
    cgptChatTimestampStore = cgptTrimChatTimestampStore(cgptChatTimestampStore);
    const persist = () => {
      chrome.storage.local.set({ [CGPT_CHAT_TIMESTAMP_STORAGE_KEY]: cgptChatTimestampStore }, () => {});
    };
    if (typeof cgptInvokeExtensionApi === "function") {
      cgptInvokeExtensionApi(persist, () => {});
      return;
    }
    try {
      persist();
    } catch (error) {
      if (typeof cgptIsExtensionContextInvalidatedError === "function" &&
        cgptIsExtensionContextInvalidatedError(error)) {
        return;
      }
      throw error;
    }
  }, 120);
}

function cgptRememberChatTimestamp(record = {}) {
  const conversationKey = String(record.conversationKey || "");
  const timestamp = typeof record.timestamp === "string" ? record.timestamp.trim() : "";
  if (!conversationKey || !timestamp) {
    return;
  }
  if (!cgptChatTimestampStoreLoaded) {
    cgptChatTimestampStoreLoaded = true;
  }
  const currentBucket = cgptNormalizeConversationTimestampBucket(cgptChatTimestampStore[conversationKey]);
  const now = new Date().toISOString();
  const nextEntries = cgptUpsertConversationTimestampEntry(currentBucket.entries, {
    messageId: record.messageId || "",
    role: record.role || "",
    order: record.order,
    textHash:
      typeof record.textHash === "string" && record.textHash
        ? record.textHash
        : cgptHashChatMessageText(record.text || ""),
    timestamp,
    capturedAt: record.capturedAt || now,
    updatedAt: now,
  });
  cgptChatTimestampStore[conversationKey] = {
    updatedAt: now,
    entries: nextEntries,
  };
  if (conversationKey === cgptActiveConversationTimestampKey) {
    cgptActiveConversationTimestampEntries = nextEntries;
  }
  cgptScheduleChatTimestampStorePersist();
}

function cgptIsHelperManagedNode(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  if (node.id === "cgpt-code-helper-panel" || node.id === "cgpt-helper-chatlog-modal") {
    return true;
  }
  if (node.classList && Array.from(node.classList).some((name) => String(name).startsWith("cgpt-helper-"))) {
    return true;
  }
  return Boolean(
    typeof node.closest === "function" &&
      node.closest(
        "#cgpt-code-helper-panel, #cgpt-helper-chatlog-modal, [class*='cgpt-helper-']"
      )
  );
}

function cgptCanContainChatMessages(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  if (cgptIsHelperManagedNode(node)) return false;
  if (node.matches && node.matches(CHAT_LOG_SELECTOR)) return true;
  return Boolean(
    typeof node.querySelector === "function" && node.querySelector(CHAT_LOG_SELECTOR)
  );
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
    cgptTriggerChatLogDownload(filePath, trimmed, {
      saveAs,
      meta: {
        source: "chat-entry",
        entryRole: entry && entry.role ? entry.role : "",
        timestamp: entry && entry.timestamp ? entry.timestamp : "",
        conversationKey:
          typeof getConversationKey === "function" ? getConversationKey() : "",
      },
    });
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
  const rolePrefix = entry && entry.role === "assistant" ? "assistant" : "user";
  const conversationKey =
    typeof getConversationKey === "function" ? getConversationKey() : "";
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
  const safeConversationKey = cgptSanitizeChatLogPathSegment(conversationKey || "current-chat");
  return `chat-logs/${safeConversationKey}/${rolePrefix}-${safe}.txt`;
}

function cgptSanitizeChatLogPathSegment(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .replace(/\.+$/, "")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  return normalized || "current-chat";
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
  const conversationKey = typeof getConversationKey === "function" ? getConversationKey() : "";
  if (typeof cgptSetCurrentConversationKey === "function") {
    cgptSetCurrentConversationKey(conversationKey);
  }
  const startTracking = () => {
    captureChatLogsFromNode(root);
    startChatLogMutationObserver();
    startChatRouteWatcher();
  };
  if (typeof cgptPrepareChatTimestampCache === "function") {
    cgptPrepareChatTimestampCache(conversationKey, startTracking);
    return;
  }
  startTracking();
}

function resetChatLogEntries() {
  chatLogEntries.length = 0;
  chatLogTrackedIds.clear();
  chatLogPendingFoldTimers.forEach((timerId) => clearTimeout(timerId));
  chatLogPendingFoldTimers.clear();
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
  if (cgptIsHelperManagedNode(rootNode)) return;

  const ownerMessage =
    rootNode.matches && rootNode.matches(CHAT_LOG_SELECTOR)
      ? rootNode
      : typeof rootNode.closest === "function"
        ? rootNode.closest(CHAT_LOG_SELECTOR)
        : null;
  if (ownerMessage && ownerMessage.dataset.cgptHelperChatTracked === "1") {
    cgptRefreshTrackedChatMessage(ownerMessage);
  }

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
  const text = extractChatMessageText(el);
  const conversationKey = typeof getConversationKey === "function" ? getConversationKey() : "";
  const order = chatLogOrderCounter++;
  const textHash = cgptHashChatMessageText(text);
  const timestamp = extractChatMessageTimestamp(el) || cgptResolveCachedChatTimestamp({
    messageId: rawId || "",
    role,
    order,
    textHash,
  });

  const entry = {
    id: entryId,
    role,
    text,
    textHash,
    timestamp,
    messageId: rawId || "",
    conversationKey,
    element: el,
    order,
    lastMutationAt: Date.now(),
  };

  cgptRememberChatTimestamp(entry);
  chatLogEntries.push(entry);
  renderChatMessageTimestamp(entry);
  cgptScheduleChatMessageFolding(entry);
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
  return "";
}

function cgptGetTrackedChatEntry(element) {
  if (!element) return null;
  const entryId =
    element.getAttribute("data-message-id") ||
    element.dataset.messageId ||
    element.getAttribute("data-id") ||
    null;
  if (entryId) {
    const exactMatch = chatLogEntries.find((entry) => entry && entry.id === entryId);
    if (exactMatch) return exactMatch;
  }
  return chatLogEntries.find((entry) => entry && entry.element === element) || null;
}

function cgptRefreshTrackedChatMessage(element) {
  const entry = cgptGetTrackedChatEntry(element);
  if (!entry) return;
  entry.text = extractChatMessageText(element);
  entry.textHash = cgptHashChatMessageText(entry.text);
  entry.conversationKey = typeof getConversationKey === "function" ? getConversationKey() : "";
  entry.timestamp =
    extractChatMessageTimestamp(element) ||
    entry.timestamp ||
    cgptResolveCachedChatTimestamp({
      messageId: entry.messageId || "",
      role: entry.role || "",
      order: entry.order,
      textHash: entry.textHash || "",
    });
  entry.lastMutationAt = Date.now();
  cgptRememberChatTimestamp(entry);
  renderChatMessageTimestamp(entry);
  if (element.dataset.cgptHelperFoldApplied !== "1") {
    cgptScheduleChatMessageFolding(entry);
  }
}

function cgptHasStableCodeBlocks(element) {
  if (!element || typeof element.querySelectorAll !== "function") return true;
  const preBlocks = Array.from(element.querySelectorAll("pre"));
  if (!preBlocks.length) return true;
  return preBlocks.every((pre) => pre.querySelector("code, .cm-content"));
}

function cgptShouldDelayChatMessageFolding(
  lastMutationAt,
  now = Date.now(),
  quietPeriodMs = CHAT_LOG_FOLD_QUIET_PERIOD_MS
) {
  const normalizedLastMutationAt = Number(lastMutationAt) || 0;
  const quietForMs = now - normalizedLastMutationAt;
  return quietForMs < quietPeriodMs;
}

function cgptScheduleChatMessageFolding(entry, attempt = 0) {
  if (!entry || !entry.element) return;
  if (entry.element.dataset.cgptHelperFoldApplied === "1") return;
  const existingTimer = chatLogPendingFoldTimers.get(entry.id);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }
  const timerId = setTimeout(() => {
    chatLogPendingFoldTimers.delete(entry.id);
    if (cgptShouldDelayChatMessageFolding(entry.lastMutationAt)) {
      if (attempt < CHAT_LOG_FOLD_MAX_RETRIES) {
        cgptScheduleChatMessageFolding(entry, attempt + 1);
      }
      return;
    }
    if (!cgptHasStableCodeBlocks(entry.element)) {
      if (attempt < CHAT_LOG_FOLD_MAX_RETRIES) {
        cgptScheduleChatMessageFolding(entry, attempt + 1);
      }
      return;
    }
    renderChatMessageFolding(entry);
  }, CHAT_LOG_FOLD_DELAY_MS);
  chatLogPendingFoldTimers.set(entry.id, timerId);
}

function renderChatMessageTimestamp(entry) {
  if (!entry || !entry.element) return;
  ensureChatLogTimestampStyle();
  const container = entry.element.querySelector(
    ".cgpt-helper-chatlog-timestamp-wrapper"
  );
  const rawTimestamp = entry && entry.timestamp ? String(entry.timestamp).trim() : "";
  if (!rawTimestamp) {
    if (container) {
      container.remove();
    }
    return;
  }
  const labelText =
    typeof cgptFormatChatLogTimestamp === "function"
      ? cgptFormatChatLogTimestamp(rawTimestamp)
      : rawTimestamp;

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
    badgeVariant: entry.role === "user" ? "userChip" : "assistantChip",
    actions: cgptBuildChatFoldActions(entry),
  });
  fold.container.dataset.cgptHelperAuthorRole = entry.role || "";

  if (timestampNode) {
    fold.titleWrapper.appendChild(timestampNode);
  }

  const body = fold.body;
  body.classList.add("cgpt-helper-message-body");
  movableNodes.forEach((node) => body.appendChild(node));

  messageElement.insertBefore(fold.container, messageElement.firstChild);

  entry.element.dataset.cgptHelperFoldApplied = "1";
  const pendingTimer = chatLogPendingFoldTimers.get(entry.id);
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    chatLogPendingFoldTimers.delete(entry.id);
  }
  if (entry.role === "assistant" && cgptShouldApplyHeadingFold(body)) {
    applyHeadingFold(body, 1);
  }
}

function extractChatMessageText(el) {
  if (!el) return "";
  const body =
    (typeof el.querySelector === "function" &&
      (el.querySelector(":scope > .cgpt-helper-fold .cgpt-helper-message-body") ||
        el.querySelector(".cgpt-helper-message-body"))) ||
    null;
  if (body) {
    if (body.innerText) return body.innerText.trim();
    if (body.textContent) return body.textContent.trim();
  }
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

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptBuildResponseFilePath,
    cgptSanitizeChatLogPathSegment,
    cgptShouldDelayChatMessageFolding,
    cgptIsHelperManagedNode,
    cgptCanContainChatMessages,
    cgptHashChatMessageText,
    cgptFindCachedChatTimestampEntry,
    cgptResolveCachedChatTimestamp,
    cgptUpsertConversationTimestampEntry,
    extractChatMessageTimestamp,
  };
}
