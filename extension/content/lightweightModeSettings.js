const CGPT_LIGHTWEIGHT_MODES = Object.freeze({
  NORMAL: "normal",
  AUTO: "auto",
  LIGHT: "light",
});

const CGPT_DEFAULT_LIGHTWEIGHT_MODE = CGPT_LIGHTWEIGHT_MODES.AUTO;
const CGPT_LIGHTWEIGHT_MODE_STORAGE_KEY = "cgptLightweightMode";

let cgptLightweightMode = CGPT_DEFAULT_LIGHTWEIGHT_MODE;

function cgptGetLightweightMode() {
  return cgptLightweightMode;
}

function cgptNormalizeLightweightMode(mode) {
  const values = Object.values(CGPT_LIGHTWEIGHT_MODES);
  if (typeof mode !== "string") {
    return CGPT_DEFAULT_LIGHTWEIGHT_MODE;
  }
  const normalized = mode.toLowerCase();
  if (values.includes(normalized)) {
    return normalized;
  }
  return CGPT_DEFAULT_LIGHTWEIGHT_MODE;
}

function cgptLightweightHasStorageSync() {
  return typeof chrome !== "undefined" &&
    chrome.storage &&
    chrome.storage.sync;
}

function cgptLoadLightweightMode(callback) {
  if (!cgptLightweightHasStorageSync()) {
    callback?.(cgptGetLightweightMode());
    return;
  }
  const resolve =
    typeof cgptCreateAsyncGuard === "function"
      ? cgptCreateAsyncGuard((result) => {
          if (result && result[CGPT_LIGHTWEIGHT_MODE_STORAGE_KEY]) {
            cgptLightweightMode = cgptNormalizeLightweightMode(
              result[CGPT_LIGHTWEIGHT_MODE_STORAGE_KEY]
            );
          }
          callback?.(cgptGetLightweightMode());
        })
      : (result) => {
          if (result && result[CGPT_LIGHTWEIGHT_MODE_STORAGE_KEY]) {
            cgptLightweightMode = cgptNormalizeLightweightMode(
              result[CGPT_LIGHTWEIGHT_MODE_STORAGE_KEY]
            );
          }
          callback?.(cgptGetLightweightMode());
        };
  chrome.storage.sync.get([CGPT_LIGHTWEIGHT_MODE_STORAGE_KEY], (result) => {
    if (chrome.runtime && chrome.runtime.lastError) {
      resolve(null);
      return;
    }
    resolve(result);
  });
}

function cgptUpdateLightweightMode(nextMode, callback) {
  cgptLightweightMode = cgptNormalizeLightweightMode(nextMode);

  const applyChange = () => {
    if (typeof cgptApplyLightweightMode === "function") {
      cgptApplyLightweightMode(cgptLightweightMode);
    }
    callback?.(cgptLightweightMode);
  };

  if (!cgptLightweightHasStorageSync()) {
    applyChange();
    return;
  }

  chrome.storage.sync.set(
    { [CGPT_LIGHTWEIGHT_MODE_STORAGE_KEY]: cgptLightweightMode },
    applyChange
  );
}
