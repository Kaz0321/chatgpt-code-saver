const CGPT_LOG_STORAGE_KEY = "cgptHelper.logs";
const CGPT_LOG_LIMIT = 200;

function cgptAppendLog(entry, callback = () => {}) {
  try {
    chrome.storage.local.get([CGPT_LOG_STORAGE_KEY], (res) => {
      let logs = Array.isArray(res[CGPT_LOG_STORAGE_KEY])
        ? res[CGPT_LOG_STORAGE_KEY]
        : [];
      logs.push(entry);
      if (logs.length > CGPT_LOG_LIMIT) {
        logs = logs.slice(logs.length - CGPT_LOG_LIMIT);
      }
      chrome.storage.local.set({ [CGPT_LOG_STORAGE_KEY]: logs }, () => {
        callback();
      });
    });
  } catch (err) {
    console.error("appendLog error", err);
    callback();
  }
}

function cgptGetLogs(callback) {
  chrome.storage.local.get([CGPT_LOG_STORAGE_KEY], (res) => {
    const logs = Array.isArray(res[CGPT_LOG_STORAGE_KEY])
      ? res[CGPT_LOG_STORAGE_KEY]
      : [];
    callback(logs);
  });
}

function cgptClearLogs(callback) {
  chrome.storage.local.set({ [CGPT_LOG_STORAGE_KEY]: [] }, callback);
}
