const CGPT_SAVE_MODES = {
  SAVE: "save",
  SAVE_AS: "saveAs",
};

function cgptGetGlobalFunction(name) {
  if (typeof globalThis === "undefined") return null;
  return typeof globalThis[name] === "function" ? globalThis[name] : null;
}

function cgptNormalizeSaveRequest(rawRequest) {
  if (!rawRequest || typeof rawRequest !== "object") {
    return { ok: false, error: "Save request is missing." };
  }

  const content = typeof rawRequest.content === "string" ? rawRequest.content : null;
  if (content === null) {
    return { ok: false, error: "Save content must be a string." };
  }

  const rawTargetPath =
    typeof rawRequest.targetPath === "string" ? rawRequest.targetPath : "";
  const validateFilePath = cgptGetGlobalFunction("cgptValidateFilePath");
  const validation = validateFilePath
    ? validateFilePath(rawTargetPath)
    : { ok: Boolean(rawTargetPath), filePath: rawTargetPath.trim() };
  if (!validation.ok) {
    return { ok: false, error: validation.error || "File path is invalid." };
  }

  const mode =
    rawRequest.mode === CGPT_SAVE_MODES.SAVE_AS
      ? CGPT_SAVE_MODES.SAVE_AS
      : CGPT_SAVE_MODES.SAVE;
  const meta =
    rawRequest.meta && typeof rawRequest.meta === "object" ? { ...rawRequest.meta } : {};
  const overrideFolderPath =
    typeof rawRequest.overrideFolderPath === "string"
      ? rawRequest.overrideFolderPath
      : "";

  return {
    ok: true,
    request: {
      content,
      targetPath: validation.filePath || rawTargetPath.trim(),
      mode,
      meta,
      overrideFolderPath,
    },
  };
}

function cgptBuildSaveMessage(request) {
  return {
    type: "applyCodeBlock",
    filePath: request.targetPath,
    content: request.content,
    saveAs: request.mode === CGPT_SAVE_MODES.SAVE_AS,
    overrideFolderPath: request.overrideFolderPath || "",
    source: request.meta && request.meta.source ? request.meta.source : "",
    conversationKey:
      request.meta && request.meta.conversationKey ? request.meta.conversationKey : "",
    entryRole: request.meta && request.meta.entryRole ? request.meta.entryRole : "",
    timestamp: request.meta && request.meta.timestamp ? request.meta.timestamp : "",
  };
}

function cgptReportSaveError(message, ui = {}) {
  const resolved = message || "Failed to save";
  if (typeof ui.onError === "function") {
    ui.onError(resolved);
  }
  if (ui.showToast !== false) {
    const toast = cgptGetGlobalFunction("showToast");
    if (toast) {
      toast(resolved, "error");
    } else if (typeof alert === "function") {
      alert(resolved);
    }
  }
}

function cgptBuildDefaultSuccessMessage(savedPath, request = null) {
  const resolvedPath = savedPath || "";
  const source = request && request.meta && request.meta.source ? request.meta.source : "";
  const mode = request && request.mode ? request.mode : CGPT_SAVE_MODES.SAVE;

  if (source === "code-block") {
    return mode === CGPT_SAVE_MODES.SAVE_AS
      ? `Saved code as: ${resolvedPath}`
      : `Saved to project: ${resolvedPath}`;
  }
  if (source === "chat-entry") {
    return mode === CGPT_SAVE_MODES.SAVE_AS
      ? `Saved chat text as: ${resolvedPath}`
      : `Saved chat text: ${resolvedPath}`;
  }
  if (source === "chat-block") {
    return mode === CGPT_SAVE_MODES.SAVE_AS
      ? `Saved code block as: ${resolvedPath}`
      : `Saved code block: ${resolvedPath}`;
  }
  return `Saved: ${resolvedPath}`;
}

function cgptReportSaveSuccess(savedPath, ui = {}, request = null) {
  const resolvedPath = savedPath || "";
  if (typeof ui.onSuccess === "function") {
    ui.onSuccess(resolvedPath);
  }
  const flashButtonText = cgptGetGlobalFunction("cgptFlashButtonText");
  if (ui.flashButtonText && ui.triggerButton && flashButtonText) {
    flashButtonText(ui.triggerButton, ui.flashButtonText);
  }
  if (ui.showToast !== false) {
    const successMessage =
      typeof ui.successMessage === "function"
        ? ui.successMessage(resolvedPath)
        : ui.successMessage || cgptBuildDefaultSuccessMessage(resolvedPath, request);
    const toast = cgptGetGlobalFunction("showToast");
    if (toast) {
      toast(successMessage, "success");
    }
  }
}

function cgptRequestSave(rawRequest, callback) {
  const normalized = cgptNormalizeSaveRequest(rawRequest);
  if (!normalized.ok) {
    callback?.({ ok: false, error: normalized.error });
    return;
  }

  const runtime =
    typeof globalThis !== "undefined" && globalThis.chrome ? globalThis.chrome.runtime : null;
  if (!runtime || typeof runtime.sendMessage !== "function") {
    callback?.({ ok: false, error: "Cannot reach background worker." });
    return;
  }

  runtime.sendMessage(cgptBuildSaveMessage(normalized.request), (response) => {
    if (!response || !response.ok) {
      callback?.({
        ok: false,
        error: (response && response.error) || "Failed to save",
      });
      return;
    }
    callback?.({
      ok: true,
      filePath: response.filePath || normalized.request.targetPath,
      response,
    });
  });
}

function cgptRunSaveAction(options = {}, callback) {
  const request = options && options.request ? options.request : null;
  const ui = options && options.ui ? options.ui : {};
  cgptRequestSave(request, (result) => {
    if (!result || !result.ok) {
      cgptReportSaveError(result && result.error ? result.error : "", ui);
      callback?.(result || { ok: false, error: "Failed to save" });
      return;
    }
    cgptReportSaveSuccess(result.filePath, ui, request);
    callback?.(result);
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CGPT_SAVE_MODES,
    cgptNormalizeSaveRequest,
    cgptBuildSaveMessage,
    cgptRequestSave,
    cgptRunSaveAction,
    cgptReportSaveError,
    cgptReportSaveSuccess,
    cgptBuildDefaultSuccessMessage,
  };
}
