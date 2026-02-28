const CGPT_PROJECT_FOLDER_STORAGE_KEY = "cgptProjectFolderPath";
const CGPT_PROJECT_FOLDER_ERROR_MESSAGES = {
  invalid: "Folder path is invalid.",
  invalidChar: "Folder path contains unsupported characters.",
  parentTraversal: "Folder path cannot include .. segments.",
};
const cgptProjectFolderChangeHandlers = new Set();

function cgptNormalizeProjectFolderPath(rawPath) {
  if (typeof rawPath !== "string") {
    return "";
  }
  let normalized = rawPath.trim();
  if (!normalized) {
    return "";
  }
  normalized = normalized.replace(/\\+/g, "/");
  normalized = normalized.replace(/\/+$/g, "");
  return normalized;
}

function cgptValidateProjectFolderPath(rawPath) {
  if (rawPath === undefined || rawPath === null) {
    return { ok: true, folderPath: "" };
  }
  if (typeof rawPath !== "string") {
    return { ok: false, error: CGPT_PROJECT_FOLDER_ERROR_MESSAGES.invalid };
  }

  const trimmed = rawPath.trim();
  if (!trimmed) {
    return { ok: true, folderPath: "" };
  }

  const invalidCharPattern = /[<>"|?*\x00]/;
  if (invalidCharPattern.test(trimmed)) {
    return { ok: false, error: CGPT_PROJECT_FOLDER_ERROR_MESSAGES.invalidChar };
  }

  const segments = trimmed.split(/[\\/]+/);
  if (segments.some((segment) => segment === "..")) {
    return { ok: false, error: CGPT_PROJECT_FOLDER_ERROR_MESSAGES.parentTraversal };
  }

  return { ok: true, folderPath: cgptNormalizeProjectFolderPath(trimmed) };
}

function cgptBuildFullFilePath(folderPath, relativeFilePath) {
  const normalizedFolder = cgptNormalizeProjectFolderPath(folderPath);
  if (!normalizedFolder) {
    return relativeFilePath;
  }
  if (!relativeFilePath) {
    return normalizedFolder;
  }
  const sanitizedRelative = relativeFilePath.replace(/^[/\\]+/, "");
  return `${normalizedFolder}/${sanitizedRelative}`;
}

function cgptGetProjectFolderPath(callback) {
  if (!callback) return;
  if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
    callback("");
    return;
  }
  chrome.storage.local.get([CGPT_PROJECT_FOLDER_STORAGE_KEY], (res) => {
    if (chrome.runtime && chrome.runtime.lastError) {
      callback("");
      return;
    }
    const path = res && typeof res[CGPT_PROJECT_FOLDER_STORAGE_KEY] === "string"
      ? res[CGPT_PROJECT_FOLDER_STORAGE_KEY]
      : "";
    callback(path);
  });
}

function cgptSetProjectFolderPath(folderPath, callback) {
  if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
    if (typeof callback === "function") {
      callback({ ok: false, error: "storage_unavailable" });
    }
    return;
  }
  chrome.storage.local.set({ [CGPT_PROJECT_FOLDER_STORAGE_KEY]: folderPath || "" }, () => {
    const lastError = chrome.runtime && chrome.runtime.lastError ? chrome.runtime.lastError.message : null;
    if (typeof callback === "function") {
      if (lastError) {
        callback({ ok: false, error: lastError });
      } else {
        callback({ ok: true });
      }
    }
  });
}

function cgptOnProjectFolderPathChanged(callback) {
  if (typeof callback !== "function") {
    return () => {};
  }
  if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.onChanged) {
    return () => {};
  }
  const handler = (changes, areaName) => {
    if (areaName !== "local") return;
    const change = changes[CGPT_PROJECT_FOLDER_STORAGE_KEY];
    if (!change) return;
    const newValue = typeof change.newValue === "string" ? change.newValue : "";
    callback(cgptNormalizeProjectFolderPath(newValue));
  };
  chrome.storage.onChanged.addListener(handler);
  cgptProjectFolderChangeHandlers.add(handler);
  return () => {
    if (cgptProjectFolderChangeHandlers.has(handler)) {
      chrome.storage.onChanged.removeListener(handler);
      cgptProjectFolderChangeHandlers.delete(handler);
    }
  };
}
