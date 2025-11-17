function cgptHandleApplyCodeBlock(message, sendResponse) {
  const filePath = message.filePath;
  const content = message.content;
  if (typeof content !== "string") {
    const errMsg = "invalid_content";
    cgptAppendLog({
      time: new Date().toISOString(),
      kind: "apply",
      ok: false,
      filePath: filePath || "",
      error: errMsg,
    });
    sendResponse({ ok: false, error: errMsg });
    return false;
  }

  const validation = validateDownloadFilePath(filePath);
  if (!validation.ok) {
    const errMsg = validation.error || "invalid_filepath";
    cgptAppendLog({
      time: new Date().toISOString(),
      kind: "apply",
      ok: false,
      filePath: filePath || "",
      error: errMsg,
    });
    sendResponse({ ok: false, error: errMsg });
    return false;
  }

  const normalizedFilePath = validation.filePath;

  const encoded = encodeURIComponent(content);
  const url = "data:text/plain;charset=utf-8," + encoded;

  chrome.downloads.download(
    {
      url,
      filename: normalizedFilePath,
      conflictAction: "overwrite",
      saveAs: false,
    },
    (downloadId) => {
      if (chrome.runtime.lastError) {
        const err = chrome.runtime.lastError.message || "unknown error";
        console.error("downloads.download error:", chrome.runtime.lastError);
        cgptAppendLog(
          {
            time: new Date().toISOString(),
            kind: "apply",
            ok: false,
            filePath: normalizedFilePath,
            error: err,
            downloadId: null,
          },
          () => {
            sendResponse({ ok: false, error: err });
          }
        );
      } else {
        console.log("Downloaded and overwrote:", filePath, "id:", downloadId);
        cgptAppendLog(
          {
            time: new Date().toISOString(),
            kind: "apply",
            ok: true,
            filePath: normalizedFilePath,
            error: "",
            downloadId,
          },
          () => {
            sendResponse({ ok: true, downloadId });
          }
        );
      }
    }
  );

  return true;
}

function validateDownloadFilePath(rawFilePath) {
  if (typeof rawFilePath !== "string") {
    return { ok: false, error: "ファイルパスが指定されていません" };
  }

  const trimmed = rawFilePath.trim();
  if (!trimmed) {
    return { ok: false, error: "ファイルパスが空です" };
  }

  if (/^[\\/]/.test(trimmed)) {
    return {
      ok: false,
      error: "ファイルパスの先頭に / または \\ は使用できません",
    };
  }

  const invalidCharPattern = /[<>:"|?*\x00]/;
  if (invalidCharPattern.test(trimmed)) {
    return {
      ok: false,
      error: "ファイルパスに使用できない文字が含まれています",
    };
  }

  const segments = trimmed.split(/[\\/]+/);
  if (segments.some((segment) => segment === "..")) {
    return { ok: false, error: "ファイルパスに .. は使用できません" };
  }

  return { ok: true, filePath: trimmed };
}
