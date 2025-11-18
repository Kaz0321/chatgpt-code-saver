const BUTTON_FEEDBACK_TIMEOUT_MS = 1500;

function cgptCreateButtonContainer() {
  const container = document.createElement("div");
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
  button.style.fontSize = "11px";
  button.style.padding = "2px 10px";
  button.style.borderRadius = "4px";
  button.style.border = "1px solid rgba(255,255,255,0.4)";
  button.style.cursor = "pointer";
  button.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
  button.style.transition = "opacity 0.2s ease";
  button.style.position = placement === "toolbar" ? "relative" : "relative";
  button.style.zIndex = placement === "toolbar" ? "1" : "2";
  return button;
}

function cgptApplyButtonVariant(button, variant) {
  const palette = {
    primary: "rgba(16, 185, 129, 0.95)",
    warning: "rgba(251, 191, 36, 0.95)",
    neutral: "rgba(55, 65, 81, 0.9)",
    muted: "rgba(75, 85, 99, 0.9)",
    accent: "rgba(59, 130, 246, 0.95)",
  };
  const color = palette[variant] || palette.neutral;
  button.style.background = color;
  button.style.color = "#fff";
}

function cgptCreateSaveButtonElement(hasMetadata = true) {
  const button = cgptCreateBaseButtonElement("overlay");
  button.textContent = "保存";
  button.title = "コードを保存";
  cgptApplyButtonVariant(button, hasMetadata ? "primary" : "muted");
  cgptSetButtonDisabled(button, !hasMetadata);
  return button;
}

function cgptCreateSaveAsButtonElement() {
  const button = cgptCreateBaseButtonElement("overlay");
  button.textContent = "保存(指定)";
  button.title = "保存先のファイル名を指定してコードを保存";
  cgptApplyButtonVariant(button, "warning");
  return button;
}

function cgptCreateCopyButtonElement() {
  const button = cgptCreateBaseButtonElement("overlay");
  button.textContent = "コピー";
  button.title = "コードをコピー";
  cgptApplyButtonVariant(button, "neutral");
  return button;
}

function cgptCreateDownloadButtonElement(hasMetadata = true) {
  const button = cgptCreateBaseButtonElement("overlay");
  button.textContent = "ダウンロード";
  button.title = hasMetadata
    ? "ファイルをダウンロード"
    : "コードブロックの先頭で file: を指定するとダウンロードできます";
  cgptApplyButtonVariant(button, hasMetadata ? "accent" : "muted");
  cgptSetButtonDisabled(button, !hasMetadata);
  return button;
}

function cgptCreateShrinkButtonElement() {
  const button = cgptCreateBaseButtonElement("overlay");
  button.textContent = "縮小";
  button.title = "1行表示に縮小";
  cgptApplyButtonVariant(button, "muted");
  return button;
}

function cgptCreateCollapseButtonElement() {
  const button = cgptCreateBaseButtonElement("overlay");
  button.textContent = "折りたたみ";
  button.title = "設定行数で折りたたみ";
  cgptApplyButtonVariant(button, "accent");
  return button;
}

function cgptCreateExpandButtonElement() {
  const button = cgptCreateBaseButtonElement("overlay");
  button.textContent = "展開";
  button.title = "全行を展開";
  cgptApplyButtonVariant(button, "accent");
  return button;
}

function cgptHandleSaveButtonClick(button, code, pre) {
  const parsed = cgptParseCodeBlockMetadata(code);
  if (!parsed) {
    if (pre) {
      const metadata = cgptRefreshSaveButtonState(pre, code);
      cgptRefreshDownloadButtonState(pre, code, metadata);
    }
    const errMsg = "コードブロックの先頭に // file: path/to/file の形式で保存先を指定してください";
    if (typeof showToast === "function") {
      showToast(errMsg, "error");
    } else {
      alert(errMsg);
    }
    return;
  }

  const { filePath, content } = parsed;
  cgptTriggerApplyCode(button, filePath, content);
}

function cgptHandleSaveAsButtonClick(button, code, pre) {
  const parsed = cgptParseCodeBlockMetadata(code);
  const defaultPath = parsed && parsed.filePath ? parsed.filePath : "";
  const userInput = prompt("保存するファイル名（パス）を入力してください", defaultPath);
  if (!userInput) {
    if (pre) {
      const metadata = cgptRefreshSaveButtonState(pre, code);
      cgptRefreshDownloadButtonState(pre, code, metadata);
    }
    return;
  }
  const filePath = userInput.trim();
  if (!filePath) {
    return;
  }
  const content = parsed && parsed.content ? parsed.content : cgptGetNormalizedCodeText(code);
  cgptTriggerApplyCode(button, filePath, content);
}

function cgptHandleDownloadButtonClick(button, code, pre) {
  const parsed = cgptParseCodeBlockMetadata(code);
  if (!parsed) {
    if (pre) {
      const metadata = cgptRefreshSaveButtonState(pre, code);
      cgptRefreshDownloadButtonState(pre, code, metadata);
    }
    const errMsg = "コードブロックの先頭で file: を指定するとダウンロードできます";
    if (typeof showToast === "function") {
      showToast(errMsg, "error");
    } else {
      alert(errMsg);
    }
    return;
  }

  const { filePath, content } = parsed;
  cgptTriggerApplyCode(button, filePath, content, {
    successButtonText: "DL済",
    successToastBuilder: (savedPath) => `ダウンロードを開始しました: ${savedPath}`,
  });
}

function cgptTriggerApplyCode(button, filePath, content, options = {}) {
  if (!filePath) return;
  const validation = cgptValidateFilePath(filePath);
  if (!validation.ok) {
    const errMsg = validation.error || "ファイルパスが不正です";
    if (typeof showToast === "function") {
      showToast(errMsg, "error");
    } else {
      alert(errMsg);
    }
    return;
  }

  const normalizedFilePath = validation.filePath;
  chrome.runtime.sendMessage(
    {
      type: "applyCodeBlock",
      filePath: normalizedFilePath,
      content,
      saveAs: Boolean(options.saveAs),
    },
    (res) => {
      if (!res || !res.ok) {
        const errorMessage =
          "保存に失敗しました: " + (res && res.error ? res.error : "unknown error");
        if (typeof showToast === "function") {
          showToast(errorMessage, "error");
        } else {
          alert(errorMessage);
        }
        return;
      }

      const savedPath = res.filePath || normalizedFilePath;
      if (successButtonText) {
        cgptFlashButtonText(button, successButtonText);
      }
      if (typeof showToast === "function") {
        const toastMessage =
          typeof successToastBuilder === "function"
            ? successToastBuilder(savedPath)
            : successToastBuilder || `保存しました: ${savedPath}`;
        showToast(toastMessage, "success");
      }
    }
  );
}

function cgptHandleCopyButtonClick(button, code) {
  const parsed = cgptParseCodeBlockMetadata(code);
  const textToCopy = parsed && parsed.content ? parsed.content : cgptGetNormalizedCodeText(code);
  if (!textToCopy) return;

  const onSuccess = () => {
    cgptFlashButtonText(button, "コピー済");
    if (typeof showToast === "function") {
      showToast("コードをコピーしました", "success");
    }
  };
  const onFailure = () => {
    if (typeof showToast === "function") {
      showToast("コピーに失敗しました", "error");
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
  if (parsedMetadata && parsedMetadata.content) {
    return parsedMetadata.content;
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

function cgptHandleCollapseButtonClick(pre) {
  cgptSetPreViewMode(pre, CGPT_VIEW_MODE.COLLAPSED);
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
    ? "コードを保存"
    : "コードブロックの先頭で file: を指定すると保存できます";
  cgptApplyButtonVariant(saveButton, hasMetadata ? "primary" : "muted");
  cgptSetButtonDisabled(saveButton, !hasMetadata);
  pre.dataset.cgptHasMetadata = hasMetadata ? "1" : "0";
  pre.dataset.cgptFilePath = hasMetadata && metadata.filePath ? metadata.filePath : "";
  return metadata;
}

function cgptRefreshDownloadButtonState(pre, code, metadataOverride) {
  if (!pre || !code) return null;
  let downloadButton = pre.cgptDownloadButton;
  if (!downloadButton) {
    downloadButton = pre.querySelector("button[data-cgpt-button-role='download']");
    if (!downloadButton) {
      return null;
    }
    pre.cgptDownloadButton = downloadButton;
  }

  const metadata =
    metadataOverride !== undefined ? metadataOverride : cgptParseCodeBlockMetadata(code);
  const hasMetadata = Boolean(metadata);
  downloadButton.title = hasMetadata
    ? "ファイルをダウンロード"
    : "コードブロックの先頭で file: を指定するとダウンロードできます";
  cgptApplyButtonVariant(downloadButton, hasMetadata ? "accent" : "muted");
  cgptSetButtonDisabled(downloadButton, !hasMetadata);
  return metadata;
}

function cgptSetButtonDisabled(button, disabled) {
  if (!button) return;
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
