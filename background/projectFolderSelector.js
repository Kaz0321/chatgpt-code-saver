const CGPT_PROJECT_FOLDER_PICKER_FILENAME = "cgpt-project-folder-placeholder.txt";

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
      cgptReadDownloadFilename(downloadId, (result) => {
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
    callback({ ok: true, filename });
  });
}

function cgptExtractFolderFromFilename(filename) {
  if (typeof filename !== "string" || !filename) {
    return "";
  }
  return filename.replace(/[\\/][^\\/]+$/, "");
}

function cgptCleanupDownload(downloadId, callback) {
  chrome.downloads.cancel(downloadId, () => {
    chrome.downloads.erase({ id: downloadId }, () => {
      if (typeof callback === "function") {
        callback();
      }
    });
  });
}
