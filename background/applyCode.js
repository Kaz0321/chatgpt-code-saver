const CGPT_KNOWN_MIME_TYPES = {
  js: "text/javascript",
  mjs: "text/javascript",
  cjs: "text/javascript",
  ts: "text/plain",
  tsx: "text/plain",
  jsx: "text/plain",
  json: "application/json",
  css: "text/css",
  scss: "text/x-scss",
  sass: "text/x-sass",
  less: "text/css",
  html: "text/html",
  htm: "text/html",
  md: "text/markdown",
  markdown: "text/markdown",
  py: "text/x-python",
  rb: "text/x-ruby",
  php: "application/x-httpd-php",
  go: "text/plain",
  java: "text/x-java-source",
  kt: "text/plain",
  swift: "text/plain",
  rs: "text/plain",
  cs: "text/plain",
  cpp: "text/x-c++src",
  c: "text/x-csrc",
  h: "text/plain",
  hpp: "text/plain",
  json5: "application/json",
  yaml: "text/yaml",
  yml: "text/yaml",
  toml: "application/toml",
  ini: "text/plain",
  sh: "text/x-shellscript",
  bash: "text/x-shellscript",
  zsh: "text/x-shellscript",
  bat: "text/plain",
  ps1: "text/plain",
  sql: "application/sql",
  xml: "application/xml",
  svg: "image/svg+xml",
  txt: "text/plain",
};

function cgptResolveDownloadAbsolutePath(downloadId, callback) {
  if (!chrome || !chrome.downloads || typeof chrome.downloads.search !== "function") {
    callback({ ok: false, error: "downloads_api_unavailable" });
    return;
  }
  chrome.downloads.search({ id: downloadId }, (items) => {
    if (chrome.runtime && chrome.runtime.lastError) {
      callback({ ok: false, error: chrome.runtime.lastError.message });
      return;
    }
    const item = items && items.length ? items[0] : null;
    const filename = item && item.filename ? item.filename : "";
    if (!filename) {
      callback({ ok: false, error: "download_path_unavailable" });
      return;
    }
    callback({ ok: true, path: filename });
  });
}

function cgptInferMimeTypeFromPath(filePath) {
  if (!filePath || typeof filePath !== "string") {
    return "text/plain";
  }
  const lastDotIndex = filePath.lastIndexOf(".");
  if (lastDotIndex === -1 || lastDotIndex === filePath.length - 1) {
    return "text/plain";
  }
  const ext = filePath.slice(lastDotIndex + 1).toLowerCase();
  return CGPT_KNOWN_MIME_TYPES[ext] || "text/plain";
}

function cgptHandleApplyCodeBlock(message, sendResponse) {
  const filePath = message.filePath;
  const content = message.content;
  const saveAs = Boolean(message.saveAs);
  const overrideFolderPathRaw =
    typeof message.overrideFolderPath === "string" ? message.overrideFolderPath : "";
  const rawFilePath = typeof filePath === "string" ? filePath : "";
  let relativeFilePath = rawFilePath;
  let absoluteFilePath = "";
  let overrideFolderPath = "";
  if (typeof content !== "string") {
    const errMsg = "invalid_content";
    cgptAppendLog({
      time: new Date().toISOString(),
      kind: "apply",
      ok: false,
      filePath: rawFilePath,
      filePathRelative: relativeFilePath,
      filePathAbsolute: absoluteFilePath,
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
      filePath: rawFilePath,
      filePathRelative: relativeFilePath,
      filePathAbsolute: absoluteFilePath,
      error: errMsg,
    });
    sendResponse({ ok: false, error: errMsg });
    return false;
  }

  const normalizedFilePath = validation.filePath;
  if (typeof normalizedFilePath === "string") {
    relativeFilePath = normalizedFilePath;
  }

  if (overrideFolderPathRaw) {
    const overrideValidation = cgptValidateProjectFolderPath(overrideFolderPathRaw);
    if (!overrideValidation.ok) {
      const errMsg = overrideValidation.error || "invalid_override_folder";
      cgptAppendLog({
        time: new Date().toISOString(),
        kind: "apply",
        ok: false,
        filePath: rawFilePath,
        filePathRelative: relativeFilePath,
        filePathAbsolute: absoluteFilePath,
        error: errMsg,
      });
      sendResponse({ ok: false, error: errMsg });
      return false;
    }
    overrideFolderPath = overrideValidation.folderPath;
  }

  const startDownloadWithFolder = (folderPath) => {
    const targetPath = cgptBuildFullFilePath(folderPath, normalizedFilePath);
    absoluteFilePath = targetPath || "";
    const encoded = encodeURIComponent(content);
    const mimeType = cgptInferMimeTypeFromPath(relativeFilePath);
    const url = `data:${mimeType};charset=utf-8,${encoded}`;

    chrome.downloads.download(
      {
        url,
        filename: targetPath,
        conflictAction: "overwrite",
        saveAs,
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
              filePath: targetPath,
              filePathRelative: relativeFilePath,
              filePathAbsolute: absoluteFilePath,
              error: err,
              downloadId: null,
            },
            () => {
              sendResponse({ ok: false, error: err });
            }
          );
        } else {
          console.log("Downloaded and overwrote:", targetPath, "id:", downloadId);
          cgptResolveDownloadAbsolutePath(downloadId, (resolved) => {
            const resolvedDownloadPath =
              resolved && resolved.ok && resolved.path ? resolved.path : "";
            const finalAbsolutePath =
              absoluteFilePath || targetPath || resolvedDownloadPath || "";
            cgptAppendLog(
              {
                time: new Date().toISOString(),
                kind: "apply",
                ok: true,
                filePath: targetPath,
                filePathRelative: relativeFilePath,
                filePathAbsolute: finalAbsolutePath,
                error: "",
                downloadId,
              },
              () => {
                sendResponse({
                  ok: true,
                  downloadId,
                  filePath: targetPath,
                  filePathAbsolute: finalAbsolutePath,
                });
              }
            );
          });
        }
      }
    );
  };

  if (overrideFolderPath) {
    startDownloadWithFolder(overrideFolderPath);
    return true;
  }

  cgptGetProjectFolderPath((folderPath) => {
    startDownloadWithFolder(folderPath);
  });

  return true;
}
