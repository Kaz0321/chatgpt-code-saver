importScripts(
  "./logStore.js",
  "./templateStore.js",
  "./applyCode.js",
  "./messageHandlers.js"
);

const CGPT_RELOAD_STATE_KEY = {
  lastReloadedAt: "lastReloadedAt",
  lastReloadedNotifiedAt: "lastReloadedNotifiedAt",
};

function cgptRefreshReloadState() {
  chrome.storage.local.set({
    [CGPT_RELOAD_STATE_KEY.lastReloadedAt]: new Date().toISOString(),
    [CGPT_RELOAD_STATE_KEY.lastReloadedNotifiedAt]: null,
  });
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    cgptRefreshReloadState();
  }
});

chrome.runtime.onMessage.addListener(cgptHandleRuntimeMessage);
