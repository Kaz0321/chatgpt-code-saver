const BUTTON_FEEDBACK_TIMEOUT_MS = 1500;

function cgptCreateButtonContainer() {
  const container = document.createElement("div");
  container.dataset.cgptCodeActions = "1";
  container.style.display = "inline-flex";
  container.style.gap = "6px";
  container.style.alignItems = "center";
  container.style.position = "absolute";
  container.style.top = "8px";
  container.style.right = "16px";
  container.style.zIndex = "2";
  container.style.display = "flex";
  return container;
}

function cgptCreateBaseButtonElement(placement = "overlay") {
  const button = document.createElement("button");
  if (typeof cgptApplySharedButtonStyle === "function") {
    cgptApplySharedButtonStyle(button, { variant: "secondary", size: "sm" });
  } else {
    button.style.fontSize = "11px";
    button.style.padding = "0 8px";
    button.style.minHeight = "28px";
    button.style.borderRadius = "6px";
    button.style.border = "1px solid rgba(148,163,184,0.72)";
    button.style.cursor = "pointer";
    button.style.transition = "opacity 0.2s ease";
  }
  button.style.position = placement === "toolbar" ? "relative" : "relative";
  button.style.zIndex = placement === "toolbar" ? "1" : "2";
  return button;
}

function cgptApplyButtonVariant(button, variant) {
  if (typeof cgptApplySharedButtonVariant === "function") {
    cgptApplySharedButtonVariant(button, variant);
    return;
  }
  const palette = {
    primary: "rgba(37, 99, 235, 1)",
    secondary: "rgba(71, 85, 105, 1)",
    success: "rgba(4, 120, 87, 1)",
    danger: "rgba(185, 28, 28, 1)",
    ghost: "rgba(15, 23, 42, 0.82)",
  };
  const color = palette[variant] || palette.secondary;
  button.style.background = color;
  button.style.color = "#fff";
  button.style.border = "1px solid rgba(255,255,255,0.4)";
}

function cgptCreateSaveButtonElement(hasMetadata = true) {
  const button = cgptCreateBaseButtonElement("overlay");
  button.textContent = "Save";
  button.title = "Save code";
  cgptApplyButtonVariant(button, hasMetadata ? "primary" : "secondary");
  cgptSetButtonDisabled(button, !hasMetadata);
  return button;
}

function cgptCreateSaveAsButtonElement() {
  const button = cgptCreateBaseButtonElement("overlay");
  button.textContent = "Save As";
  button.title = "Save code with a custom filename";
  cgptApplyButtonVariant(button, "secondary");
  return button;
}

function cgptCreateCopyButtonElement() {
  const button = cgptCreateBaseButtonElement("overlay");
  button.textContent = "Copy";
  button.title = "Copy code";
  cgptApplyButtonVariant(button, "ghost");
  return button;
}

function cgptCreateShrinkButtonElement() {
  const button = cgptCreateBaseButtonElement("overlay");
  button.textContent = "Compact";
  button.title = "Show a single line";
  cgptApplyButtonVariant(button, "secondary");
  return button;
}

function cgptCreateExpandButtonElement() {
  const button = cgptCreateBaseButtonElement("overlay");
  button.textContent = "Expand";
  button.title = "Show all lines";
  cgptApplyButtonVariant(button, "secondary");
  return button;
}

function cgptHandleSaveButtonClick(button, code, pre) {
  const parsed = cgptParseCodeBlockMetadata(code);
  if (!parsed) {
    if (pre) {
      const metadata = cgptRefreshSaveButtonState(pre, code);
    }
    const errMsg = "Add // file: path/to/file on the first line before saving.";
    if (typeof showToast === "function") {
      showToast(errMsg, "error");
    } else {
      alert(errMsg);
    }
    return;
  }

  const { filePath } = parsed;
  const content = cgptGetContentForSave(parsed, code);
  cgptTriggerApplyCode(button, filePath, content);
}

function cgptHandleSaveAsButtonClick(button, code) {
  const parsed = cgptParseCodeBlockMetadata(code);
  const filePath = cgptGetSuggestedRelativeFilePath(parsed);
  const content = cgptGetContentForSave(parsed, code);
  cgptTriggerApplyCode(button, filePath, content, {
    mode: typeof CGPT_SAVE_MODES !== "undefined" ? CGPT_SAVE_MODES.SAVE_AS : "saveAs",
  });
}

function cgptTriggerApplyCode(button, filePath, content, options = {}) {
  const {
    mode = typeof CGPT_SAVE_MODES !== "undefined" ? CGPT_SAVE_MODES.SAVE : "save",
    successButtonText,
    successToastBuilder,
  } = options;
  if (typeof cgptRunSaveAction !== "function") return;
  cgptRunSaveAction({
    request: {
      content,
      targetPath: filePath,
      mode,
      meta: {
        source: "code-block",
      },
    },
    ui: {
      triggerButton: button,
      flashButtonText: successButtonText,
      successMessage: successToastBuilder,
    },
  });
}

function cgptHandleCopyButtonClick(button, code) {
  const parsed = cgptParseCodeBlockMetadata(code);
  const textToCopy = parsed && parsed.content ? parsed.content : cgptGetNormalizedCodeText(code);
  if (!textToCopy) return;

  const onSuccess = () => {
    cgptFlashButtonText(button, "Copied");
    if (typeof showToast === "function") {
      showToast("Copied code", "success");
    }
  };
  const onFailure = () => {
    if (typeof showToast === "function") {
      showToast("Failed to copy", "error");
    }
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textToCopy).then(onSuccess).catch(onFailure);
    return;
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = textToCopy;
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (ok) {
      onSuccess();
    } else {
      onFailure();
    }
  } catch (error) {
    onFailure();
  }
}

function cgptGetContentForSave(parsedMetadata, code) {
  if (parsedMetadata) {
    const shouldStrip =
      typeof cgptShouldStripMetadataLine === "function"
        ? cgptShouldStripMetadataLine()
        : true;
    if (shouldStrip) {
      return parsedMetadata.content || "";
    }
    const metadataLine = parsedMetadata.metadataLine || "";
    if (!metadataLine) {
      return cgptGetNormalizedCodeText(code);
    }
    return parsedMetadata.content
      ? `${metadataLine}\n${parsedMetadata.content}`
      : metadataLine;
  }
  const normalized = cgptGetNormalizedCodeText(code);
  return cgptStripFirstLineIfNeeded(normalized);
}

function cgptStripFirstLineIfNeeded(text) {
  if (!text || typeof cgptShouldStripMetadataLine !== "function") {
    return text;
  }
  if (!cgptShouldStripMetadataLine()) {
    return text;
  }
  const normalized = text.replace(/\r\n/g, "\n");
  const [firstLine, ...rest] = normalized.split("\n");
  if (!cgptLineLooksLikeFileInstruction(firstLine)) {
    return normalized;
  }
  return rest.join("\n");
}

function cgptLineLooksLikeFileInstruction(line) {
  if (!line) return false;
  return /^\s*(?:\/\/|#)?\s*file\s*:/.test(line);
}

function cgptGetSuggestedRelativeFilePath(parsedMetadata) {
  if (parsedMetadata && parsedMetadata.filePath) {
    return parsedMetadata.filePath;
  }
  return cgptGenerateDefaultRelativeFilePath();
}

function cgptGenerateDefaultRelativeFilePath() {
  const now = new Date();
  const pad = (value) => `${value}`.padStart(2, "0");
  const timestamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `code-block-${timestamp}.txt`;
}

function cgptFlashButtonText(button, text) {
  if (!button) return;
  const original = button.textContent;
  button.textContent = text;
  setTimeout(() => {
    button.textContent = original;
  }, BUTTON_FEEDBACK_TIMEOUT_MS);
}

function cgptHandleShrinkButtonClick(pre) {
  cgptSetPreViewMode(pre, CGPT_VIEW_MODE.COMPACT);
}

function cgptHandleExpandButtonClick(pre) {
  cgptSetPreViewMode(pre, CGPT_VIEW_MODE.EXPANDED);
}

function cgptRefreshSaveButtonState(pre, code, metadataOverride) {
  if (!pre || !code) return null;
  let saveButton = pre.cgptSaveButton;
  if (!saveButton) {
    saveButton = pre.querySelector("button[data-cgpt-button-role='save']");
    if (!saveButton) {
      return null;
    }
    pre.cgptSaveButton = saveButton;
  }

  const metadata =
    metadataOverride !== undefined ? metadataOverride : cgptParseCodeBlockMetadata(code);
  const hasMetadata = Boolean(metadata);
  saveButton.title = hasMetadata
    ? "Save code"
    : "Add // file: path/to/file to the first line to enable Save";
  cgptApplyButtonVariant(saveButton, hasMetadata ? "primary" : "secondary");
  cgptSetButtonDisabled(saveButton, !hasMetadata);
  pre.dataset.cgptHasMetadata = hasMetadata ? "1" : "0";
  pre.dataset.cgptFilePath = hasMetadata && metadata.filePath ? metadata.filePath : "";
  return metadata;
}

function cgptSetButtonDisabled(button, disabled) {
  if (!button) return;
  if (typeof cgptSetSharedButtonDisabled === "function") {
    cgptSetSharedButtonDisabled(button, disabled);
    return;
  }
  button.disabled = disabled;
  button.style.opacity = disabled ? "0.5" : "1";
  button.style.cursor = disabled ? "not-allowed" : "pointer";
}

function cgptCalculateButtonOverlayOffset(container) {
  if (!container) return 0;
  const rect =
    typeof container.getBoundingClientRect === "function"
      ? container.getBoundingClientRect()
      : null;
  const height = rect && rect.height ? rect.height : container.offsetHeight || 0;
  const topOffset = parseFloat(container.style.top || "0") || 0;
  const SAFE_MARGIN_PX = 8;
  return Math.max(0, height + topOffset + SAFE_MARGIN_PX);
}
