const DEFAULT_VIEW_SETTINGS = {
  compactLineCount: 1,
};

let cgptViewSettings = { ...DEFAULT_VIEW_SETTINGS };

function cgptGetViewSettings() {
  return { ...cgptViewSettings };
}

function cgptNormalizeLineCount(value, fallback, minValue = 1) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const normalized = Math.max(parsed, minValue);
  return Math.min(normalized, 200);
}

function cgptMergeViewSettings(nextSettings) {
  if (!nextSettings || typeof nextSettings !== "object") {
    return;
  }
  if (typeof nextSettings.compactLineCount !== "undefined") {
    cgptViewSettings.compactLineCount = cgptNormalizeLineCount(
      nextSettings.compactLineCount,
      DEFAULT_VIEW_SETTINGS.compactLineCount,
      0
    );
  }
}

function cgptHasStorageSync() {
  return typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync;
}

function cgptLoadViewSettings(callback) {
  if (!cgptHasStorageSync()) {
    callback?.(cgptGetViewSettings());
    return;
  }
  chrome.storage.sync.get(["cgptViewSettings"], (result) => {
    if (result && result.cgptViewSettings) {
      cgptMergeViewSettings(result.cgptViewSettings);
    }
    callback?.(cgptGetViewSettings());
  });
}

function cgptUpdateViewSettings(partialSettings, callback) {
  cgptMergeViewSettings(partialSettings);
  if (!cgptHasStorageSync()) {
    callback?.(cgptGetViewSettings());
    return;
  }
  chrome.storage.sync.set({ cgptViewSettings }, () => {
    callback?.(cgptGetViewSettings());
  });
}
