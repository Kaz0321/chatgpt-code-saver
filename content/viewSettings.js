const DEFAULT_VIEW_SETTINGS = {
  compactLineCount: 1,
  collapsedLineCount: 12,
};

let cgptViewSettings = { ...DEFAULT_VIEW_SETTINGS };

function cgptGetViewSettings() {
  return { ...cgptViewSettings };
}

function cgptNormalizeLineCount(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, 200);
}

function cgptMergeViewSettings(nextSettings) {
  if (!nextSettings || typeof nextSettings !== "object") {
    return;
  }
  if (typeof nextSettings.compactLineCount !== "undefined") {
    cgptViewSettings.compactLineCount = cgptNormalizeLineCount(
      nextSettings.compactLineCount,
      DEFAULT_VIEW_SETTINGS.compactLineCount
    );
  }
  if (typeof nextSettings.collapsedLineCount !== "undefined") {
    cgptViewSettings.collapsedLineCount = cgptNormalizeLineCount(
      nextSettings.collapsedLineCount,
      DEFAULT_VIEW_SETTINGS.collapsedLineCount
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
