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

  const validation = cgptValidateFilePath(filePath);
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
