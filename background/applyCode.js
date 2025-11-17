function cgptHandleApplyCodeBlock(message, sendResponse) {
  const filePath = message.filePath;
  const content = message.content;
  if (!filePath || typeof content !== "string") {
    const errMsg = "invalid_params";
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

  const encoded = encodeURIComponent(content);
  const url = "data:text/plain;charset=utf-8," + encoded;

  chrome.downloads.download(
    {
      url,
      filename: filePath,
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
            filePath,
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
            filePath,
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
