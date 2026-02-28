function cgptTriggerChatLogDownload(filePath, content, options = {}) {
  const { onDone, saveAs = false, overrideFolderPath = "" } = options;
  const callback = typeof onDone === "function" ? onDone : () => {};
  if (!chrome || !chrome.runtime || typeof chrome.runtime.sendMessage !== "function") {
    callback();
    if (typeof showToast === "function") {
      showToast("Cannot reach background worker.", "error");
    }
    return;
  }
  chrome.runtime.sendMessage(
    { type: "applyCodeBlock", filePath, content, saveAs, overrideFolderPath },
    (res) => {
      callback();
      if (!res || !res.ok) {
        const errMsg = (res && res.error) || "Failed to download";
        if (typeof showToast === "function") {
          showToast(errMsg, "error");
        } else {
          alert(errMsg);
        }
      } else if (typeof showToast === "function") {
        showToast(`Started download: ${filePath}`, "success");
      }
    }
  );
}

function cgptCreateBatchSaveAllButton(blocks) {
  return cgptCreateBatchSaveButton(blocks, {
    label: "Save All",
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
  const { label = "Save All", variant = "success", pendingLabel = "Saving..." } = options;
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
  const button = document.createElement("button");
  button.textContent = label;
  button.style.fontSize = size === "sm" ? "11px" : "12px";
  button.style.padding = size === "sm" ? "2px 8px" : "4px 10px";
  button.style.borderRadius = "4px";
  button.style.border = "1px solid rgba(255,255,255,0.3)";
  button.style.cursor = "pointer";
  button.style.transition = "opacity 0.2s ease";
  if (typeof cgptApplySharedButtonVariant === "function") {
    cgptApplySharedButtonVariant(button, variant);
  } else {
    const fallback = {
      accent: "#2563eb",
      success: "#059669",
      muted: "#4b5563",
      secondary: "#374151",
    };
    button.style.background = fallback[variant] || fallback.secondary;
    button.style.color = "#fff";
  }
  return button;
}

function cgptSetChatLogButtonDisabled(button, disabled) {
  if (!button) return;
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
  const button = cgptCreateChatLogButton("Save", "success", "sm");
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
    onDone: () => {
      button.textContent = originalText;
      cgptSetChatLogButtonDisabled(button, false);
    },
  });
}
