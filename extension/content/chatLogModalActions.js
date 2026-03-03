function cgptTriggerChatLogDownload(filePath, content, options = {}) {
  const {
    onDone,
    saveAs = false,
    overrideFolderPath = "",
    meta = {},
    showToast: shouldShowToast = true,
    successMessage,
  } = options;
  const callback = typeof onDone === "function" ? onDone : () => {};
  if (typeof cgptRunSaveAction !== "function") {
    callback();
    return;
  }
  cgptRunSaveAction(
    {
      request: {
        content,
        targetPath: filePath,
        mode: saveAs && typeof CGPT_SAVE_MODES !== "undefined"
          ? CGPT_SAVE_MODES.SAVE_AS
          : typeof CGPT_SAVE_MODES !== "undefined"
            ? CGPT_SAVE_MODES.SAVE
            : saveAs
              ? "saveAs"
              : "save",
        meta: {
          source: "chat-batch",
          ...meta,
        },
        overrideFolderPath,
      },
      ui: {
        showToast: shouldShowToast,
        successMessage,
        onSuccess: () => {
          callback();
        },
        onError: () => {
          callback();
        },
      },
    }
  );
}

function cgptCreateBatchSaveAllButton(blocks) {
  return cgptCreateBatchSaveButton(blocks, {
    label: "Save All",
    variant: "primary",
    pendingLabel: "Saving...",
  });
}

function cgptCreateBatchSaveAsAllButton(blocks) {
  const button = cgptCreateChatLogButton("Save As All", "secondary", "sm");
  cgptSetChatLogButtonDisabled(button, !blocks || !blocks.length);
  if (!blocks || !blocks.length) {
    return button;
  }
  button.addEventListener("click", () => {
    if (button.disabled) return;
    cgptHandleBatchSaveAsAll(button, blocks);
  });
  return button;
}

function cgptCreateBatchSaveButton(blocks, options = {}) {
  const { label = "Save All", variant = "primary", pendingLabel = "Saving..." } = options;
  const button = cgptCreateChatLogButton(label, variant, "sm");
  cgptSetChatLogButtonDisabled(button, !blocks || !blocks.length);
  if (!blocks || !blocks.length) {
    return button;
  }
  button.addEventListener("click", async () => {
    if (button.disabled) return;
    await cgptHandleBatchSave(button, blocks, { pendingLabel });
  });
  return button;
}

async function cgptHandleBatchSave(button, blocks, options = {}) {
  const originalText = button.textContent;
  cgptSetChatLogButtonDisabled(button, true);
  button.textContent = options.pendingLabel || "Saving...";
  try {
    await cgptDownloadCodeBlocksSequentially(blocks);
  } finally {
    button.textContent = originalText;
    cgptSetChatLogButtonDisabled(button, false);
  }
}

async function cgptHandleBatchSaveAsAll(button, blocks) {
  const originalText = button.textContent;
  cgptSetChatLogButtonDisabled(button, true);
  button.textContent = "Selecting...";
  try {
    const folderPath = await cgptPromptUserForDownloadFolder();
    if (!folderPath) {
      return;
    }
    button.textContent = "Saving...";
    await cgptDownloadCodeBlocksSequentially(blocks, { overrideFolderPath: folderPath });
    if (typeof showToast === "function") {
      showToast(`Saved to: ${folderPath}`, "success");
    }
  } catch (error) {
    const message = (error && error.message) || "Failed to select a folder.";
    if (typeof showToast === "function") {
      showToast(message, "error");
    }
  } finally {
    button.textContent = originalText;
    cgptSetChatLogButtonDisabled(button, false);
  }
}

function cgptCreateChatLogButton(label, variant = "secondary", size = "md") {
  const useChipButton = variant === "secondary" || variant === "ghost" || variant === "primary";
  const button =
    typeof cgptCreateSharedChipButton === "function" && useChipButton
      ? cgptCreateSharedChipButton(label, size)
      : typeof cgptCreateSharedButton === "function"
        ? cgptCreateSharedButton(label, variant, size)
        : document.createElement("button");
  if (!button.textContent) {
    button.textContent = label;
  }
  if (typeof cgptCreateSharedButton !== "function") {
    button.style.fontSize = size === "sm" ? "11px" : "12px";
    button.style.padding = size === "sm" ? "0 8px" : "0 10px";
    button.style.minHeight = size === "sm" ? "28px" : "32px";
    button.style.borderRadius = "6px";
    button.style.border = "1px solid rgba(255,255,255,0.3)";
    button.style.cursor = "pointer";
    button.style.transition = "opacity 0.2s ease";
    if (typeof cgptApplySharedButtonVariant === "function") {
      cgptApplySharedButtonVariant(button, variant);
    } else {
      const fallback = {
        primary: "#2563eb",
        success: "#047857",
        danger: "#b91c1c",
        secondary: "#475569",
        ghost: "rgba(15, 23, 42, 0.82)",
      };
      button.style.background = fallback[variant] || fallback.secondary;
      button.style.color = "#fff";
    }
  }
  return button;
}

function cgptSetChatLogButtonDisabled(button, disabled) {
  if (!button) return;
  if (typeof cgptSetSharedButtonDisabled === "function") {
    cgptSetSharedButtonDisabled(button, disabled);
    return;
  }
  button.disabled = disabled;
  button.style.opacity = disabled ? "0.5" : "1";
  button.style.cursor = disabled ? "not-allowed" : "pointer";
}

function cgptDownloadCodeBlocksSequentially(blocks, options = {}) {
  const normalizedBlocks = Array.isArray(blocks) ? blocks : [];
  return normalizedBlocks.reduce((promise, block) => {
    return promise.then(() => cgptCreateBlockDownloadPromise(block, options));
  }, Promise.resolve());
}

function cgptCreateBlockDownloadPromise(block, options = {}) {
  return new Promise((resolve) => {
    cgptTriggerChatLogDownload(block.filePath, block.content, {
      saveAs: Boolean(options.saveAs),
      overrideFolderPath: options.overrideFolderPath,
      showToast: options.showToast,
      meta: options.meta,
      onDone: resolve,
    });
  });
}

function cgptPromptUserForDownloadFolder() {
  return new Promise((resolve, reject) => {
    const canSendRuntimeMessage =
      typeof chrome !== "undefined" && chrome.runtime && typeof chrome.runtime.sendMessage === "function";
    if (!canSendRuntimeMessage) {
      reject(new Error("Unable to start the folder picker."));
      return;
    }

    chrome.runtime.sendMessage({ type: "pickDownloadFolder" }, (response) => {
      if (chrome.runtime && chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response) {
        reject(new Error("Failed to select a folder."));
        return;
      }
      if (!response.ok) {
        if (response.error === "folder_picker_canceled") {
          resolve("");
          return;
        }
        reject(new Error(response.error || "Failed to select a folder."));
        return;
      }
      resolve(response.folderPath || "");
    });
  });
}

function cgptJumpToCodeBlock(targetElement) {
  if (!targetElement) return;
  if (typeof highlightChatMessageElement === "function") {
    highlightChatMessageElement(targetElement);
    return;
  }
  if (typeof targetElement.scrollIntoView === "function") {
    targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function cgptCreateBlockSaveButton(block) {
  const button = cgptCreateChatLogButton("Save", "primary", "sm");
  if (!block || !block.filePath) {
    cgptSetChatLogButtonDisabled(button, true);
    button.title = "File path not detected";
    return button;
  }
  button.addEventListener("click", () => {
    cgptHandleBlockSave(button, block, false);
  });
  return button;
}

function cgptCreateBlockSaveAsButton(block) {
  const button = cgptCreateChatLogButton("Save As", "secondary", "sm");
  if (!block || !block.filePath) {
    cgptSetChatLogButtonDisabled(button, true);
    button.title = "File path not detected";
    return button;
  }
  button.addEventListener("click", () => {
    cgptHandleBlockSave(button, block, true);
  });
  return button;
}

function cgptHandleBlockSave(button, block, saveAs) {
  if (!button || button.disabled || !block || !block.filePath) return;
  const originalText = button.textContent;
  cgptSetChatLogButtonDisabled(button, true);
  button.textContent = "Saving...";
  cgptTriggerChatLogDownload(block.filePath, block.content, {
    saveAs,
    meta: {
      source: "chat-block",
    },
    onDone: () => {
      button.textContent = originalText;
      cgptSetChatLogButtonDisabled(button, false);
    },
  });
}
