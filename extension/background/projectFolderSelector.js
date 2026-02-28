const CGPT_PROJECT_FOLDER_PICKER_FILENAME = "cgpt-project-folder-placeholder.txt";
const CGPT_PROJECT_FOLDER_PICKER_TIMEOUT_MS = 60 * 1000;

function cgptPromptProjectFolderSelection(callback) {
  const dataUrl = "data:text/plain;charset=utf-8," + encodeURIComponent("Select project folder for GPT helper");
  chrome.downloads.download(
    {
      url: dataUrl,
      filename: CGPT_PROJECT_FOLDER_PICKER_FILENAME,
      saveAs: true,
      conflictAction: "overwrite",
    },
    (downloadId) => {
      if (chrome.runtime.lastError || typeof downloadId !== "number") {
        const errorMessage = (chrome.runtime.lastError && chrome.runtime.lastError.message) || "folder_picker_canceled";
        callback({ ok: false, error: errorMessage });
        return;
      }
      cgptWaitForFolderPickerResult(downloadId, (result) => {
        if (!result.ok) {
          cgptCleanupDownload(downloadId, () => {
            callback(result);
          });
          return;
        }
        const folderPath = cgptExtractFolderFromFilename(result.filename);
        const validation = cgptValidateProjectFolderPath(folderPath);
        if (!validation.ok) {
          cgptCleanupDownload(downloadId, () => {
            callback({ ok: false, error: validation.error || "invalid_folder_path" });
          });
          return;
        }
        cgptCleanupDownload(downloadId, () => {
          callback({ ok: true, folderPath: validation.folderPath });
        });
      });
    }
  );
}

function cgptReadDownloadFilename(downloadId, callback) {
  chrome.downloads.search({ id: downloadId }, (items) => {
    if (chrome.runtime.lastError || !items || !items.length) {
      const errorMessage = (chrome.runtime.lastError && chrome.runtime.lastError.message) || "download_lookup_failed";
      callback({ ok: false, error: errorMessage });
      return;
    }
    const item = items[0];
    const filename = item && item.filename ? item.filename : "";
    if (!filename) {
      callback({ ok: false, error: "filename_unavailable" });
      return;
    }
    callback({
      ok: true,
      filename,
      state: item.state,
      downloadError: item.error,
    });
  });
}

function cgptWaitForFolderPickerResult(downloadId, callback) {
  let settled = false;
  const onChangeHandler = (delta) => {
    if (delta.id !== downloadId || !delta.state) {
      return;
    }
    const state = delta.state.current;
    if (state === "complete" || state === "interrupted") {
      resolveFromDownloadItem();
    }
  };

  const finalize = (result) => {
    if (settled) {
      return;
    }
    settled = true;
    chrome.downloads.onChanged.removeListener(onChangeHandler);
    clearTimeout(timeoutId);
    callback(result);
  };

  const resolveFromDownloadItem = () => {
    cgptReadDownloadFilename(downloadId, (result) => {
      if (!result.ok) {
        finalize(result);
        return;
      }
      const state = result.state;
      if (state === "complete") {
        finalize({ ok: true, filename: result.filename });
        return;
      }
      if (state === "interrupted") {
        const errorMessage = result.downloadError || "folder_picker_canceled";
        finalize({ ok: false, error: errorMessage });
      }
    });
  };

  const timeoutId = setTimeout(() => {
    finalize({ ok: false, error: "folder_picker_timeout" });
  }, CGPT_PROJECT_FOLDER_PICKER_TIMEOUT_MS);

  chrome.downloads.onChanged.addListener(onChangeHandler);
  resolveFromDownloadItem();
}

function cgptExtractFolderFromFilename(filename) {
  if (typeof filename !== "string") {
    return "";
  }
  let sanitized = filename.trim();
  if (!sanitized) {
    return "";
  }
  sanitized = sanitized.replace(/\\+/g, "/");
  sanitized = sanitized.replace(/\.crdownload$/i, "");
  if (sanitized.endsWith(`/${CGPT_PROJECT_FOLDER_PICKER_FILENAME}`)) {
    return sanitized.slice(0, sanitized.length - CGPT_PROJECT_FOLDER_PICKER_FILENAME.length - 1);
  }
  const separatorIndex = sanitized.lastIndexOf("/");
  if (separatorIndex === -1) {
    return "";
  }
  return sanitized.slice(0, separatorIndex);
}

function cgptCleanupDownload(downloadId, callback) {
  chrome.downloads.cancel(downloadId, () => {
    cgptRemoveDownloadedFile(downloadId, () => {
      chrome.downloads.erase({ id: downloadId }, () => {
        if (typeof callback === "function") {
          callback();
        }
      });
    });
  });
}

function cgptRemoveDownloadedFile(downloadId, callback) {
  if (!chrome.downloads || typeof chrome.downloads.removeFile !== "function") {
    if (typeof callback === "function") {
      callback();
    }
    return;
  }
  chrome.downloads.removeFile(downloadId, () => {
    if (typeof callback === "function") {
      callback();
    }
  });
}
