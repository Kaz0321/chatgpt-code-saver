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
  button.textContent = hasMetadata ? "保存" : "保存(指定)";
  button.title = hasMetadata ? "コードを保存" : "保存先のファイル名を指定してコードを保存";
  cgptApplyButtonVariant(button, hasMetadata ? "primary" : "warning");
  return button;
}

function cgptCreateCopyButtonElement() {
  const button = cgptCreateBaseButtonElement("overlay");
  button.textContent = "コピー";
  button.title = "コードをコピー";
  cgptApplyButtonVariant(button, "neutral");
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

function cgptHandleSaveButtonClick(button, code) {
  const parsed = cgptParseCodeBlockMetadata(code);
  if (!parsed) {
    const userInput = prompt("保存するファイル名（パス）を入力してください", "");
    if (!userInput) {
      return;
    }
    const filePath = userInput.trim();
    if (!filePath) {
      return;
    }
    const content = cgptGetNormalizedCodeText(code);
    cgptTriggerApplyCode(button, filePath, content);
    return;
  }

  const { filePath, content } = parsed;
  cgptTriggerApplyCode(button, filePath, content);
}

function cgptTriggerApplyCode(button, filePath, content) {
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
    { type: "applyCodeBlock", filePath: normalizedFilePath, content },
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

      cgptFlashButtonText(button, "保存済");
      if (typeof showToast === "function") {
        showToast(`保存しました: ${normalizedFilePath}`, "success");
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
  if (!pre || !code) return;
  let saveButton = pre.cgptSaveButton;
  if (!saveButton) {
    saveButton = pre.querySelector("button[data-cgpt-button-role='save']");
    if (!saveButton) {
      return;
    }
    pre.cgptSaveButton = saveButton;
  }

  const metadata =
    metadataOverride !== undefined ? metadataOverride : cgptParseCodeBlockMetadata(code);
  const hasMetadata = Boolean(metadata);
  const label = hasMetadata ? "保存" : "保存(指定)";
  const title = hasMetadata ? "コードを保存" : "保存先のファイル名を指定してコードを保存";

  saveButton.textContent = label;
  saveButton.title = title;
  cgptApplyButtonVariant(saveButton, hasMetadata ? "primary" : "warning");
  pre.dataset.cgptHasMetadata = hasMetadata ? "1" : "0";
}
