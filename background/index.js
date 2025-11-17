importScripts("./logStore.js", "./templateStore.js", "./applyCode.js");

const CGPT_RELOAD_STATE_KEY = {
  lastReloadedAt: "lastReloadedAt",
  lastReloadedNotifiedAt: "lastReloadedNotifiedAt",
};

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    chrome.storage.local.set({
      [CGPT_RELOAD_STATE_KEY.lastReloadedAt]: new Date().toISOString(),
      [CGPT_RELOAD_STATE_KEY.lastReloadedNotifiedAt]: null,
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  if (message.type === "applyCodeBlock") {
    return cgptHandleApplyCodeBlock(message, sendResponse);
  }

  if (message.type === "reloadExtension") {
    chrome.runtime.reload();
    sendResponse({ ok: true });
    return;
  }

  if (message.type === "getTemplates") {
    cgptGetTemplates((templates) => {
      sendResponse({ ok: true, templates });
    });
    return true;
  }

  if (message.type === "setTemplates") {
    const templates = message.templates || [];
    cgptSetTemplates(templates, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ ok: true });
      }
    });
    return true;
  }

  if (message.type === "getLogs") {
    cgptGetLogs((logs) => {
      sendResponse({ ok: true, logs });
    });
    return true;
  }

  if (message.type === "clearLogs") {
    cgptClearLogs(() => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ ok: true });
      }
    });
    return true;
  }

  if (message.type === "openDownloadedFile") {
    const downloadId = message.downloadId;
    if (typeof downloadId !== "number") {
      sendResponse({ ok: false, error: "invalid_download_id" });
      return;
    }
    chrome.downloads.open(downloadId);
    if (chrome.runtime.lastError) {
      sendResponse({ ok: false, error: chrome.runtime.lastError.message });
    } else {
      sendResponse({ ok: true });
    }
    return;
  }
});
