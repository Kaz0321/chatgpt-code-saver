const DEFAULT_SAVE_OPTIONS = {
  stripFirstLineMetadata: false,
};

let cgptSaveOptions = { ...DEFAULT_SAVE_OPTIONS };

function cgptGetSaveOptions() {
  return { ...cgptSaveOptions };
}

function cgptShouldStripMetadataLine() {
  return Boolean(cgptSaveOptions.stripFirstLineMetadata);
}

function cgptMergeSaveOptions(nextOptions) {
  if (!nextOptions || typeof nextOptions !== "object") {
    return;
  }
  if (typeof nextOptions.stripFirstLineMetadata !== "undefined") {
    cgptSaveOptions.stripFirstLineMetadata = Boolean(nextOptions.stripFirstLineMetadata);
  }
}

function cgptHasStorageSyncAccess() {
  return typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync;
}

function cgptLoadSaveOptions(callback) {
  if (!cgptHasStorageSyncAccess()) {
    callback?.(cgptGetSaveOptions());
    return;
  }
  chrome.storage.sync.get(["cgptSaveOptions"], (result) => {
    if (result && result.cgptSaveOptions) {
      cgptMergeSaveOptions(result.cgptSaveOptions);
    }
    callback?.(cgptGetSaveOptions());
  });
}

function cgptUpdateSaveOptions(partialOptions, callback) {
  cgptMergeSaveOptions(partialOptions);
  if (!cgptHasStorageSyncAccess()) {
    callback?.(cgptGetSaveOptions());
    return;
  }
  chrome.storage.sync.set({ cgptSaveOptions }, () => {
    callback?.(cgptGetSaveOptions());
  });
}
