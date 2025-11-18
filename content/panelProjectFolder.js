function createProjectFolderSection() {
  const section = document.createElement("div");
  section.appendChild(createSectionLabel("プロジェクトフォルダ"));

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "例: dev/my-project";
  input.style.width = "100%";
  input.style.padding = "4px 6px";
  input.style.fontSize = "11px";
  input.style.borderRadius = "4px";
  input.style.border = "1px solid rgba(255,255,255,0.2)";
  input.style.background = "#1f2937";
  input.style.color = "#fff";
  section.appendChild(input);

  cgptGetProjectFolderPath((folderPath) => {
    input.value = folderPath || "";
  });

  if (typeof cgptOnProjectFolderPathChanged === "function") {
    cgptOnProjectFolderPathChanged((newFolderPath) => {
      input.value = newFolderPath || "";
    });
  }

  const buttons = createButtonRow();
  const selectBtn = createPanelButton("Choose Folder", "accent");
  selectBtn.style.flex = "1";
  selectBtn.addEventListener("click", () => {
    requestProjectFolderSelection(input, selectBtn);
  });
  buttons.appendChild(selectBtn);

  const saveBtn = createPanelButton("Save", "success");
  saveBtn.style.flex = "1";
  saveBtn.addEventListener("click", () => {
    commitProjectFolderInput(input);
  });
  buttons.appendChild(saveBtn);
  section.appendChild(buttons);
  return section;
}

function commitProjectFolderInput(input) {
  if (!input) return;
  const rawValue = input.value || "";
  const validation = cgptValidateProjectFolderPath(rawValue);
  if (!validation.ok) {
    if (typeof showToast === "function") {
      showToast(validation.error || "フォルダパスが不正です", "error");
    }
    return;
  }
  persistProjectFolderSelection(input, validation.folderPath);
}

function persistProjectFolderSelection(input, normalizedPath) {
  if (!input) return;
  cgptSetProjectFolderPath(normalizedPath || "", (result) => {
    if (!result || !result.ok) {
      const errMsg = (result && result.error) || "フォルダの保存に失敗しました";
      if (typeof showToast === "function") {
        showToast(errMsg, "error");
      }
      return;
    }
    input.value = normalizedPath || "";
    if (typeof showToast === "function") {
      const message = normalizedPath
        ? `プロジェクトフォルダを保存しました: ${normalizedPath}`
        : "プロジェクトフォルダ設定をクリアしました";
      showToast(message, "success");
    }
  });
}

function requestProjectFolderSelection(input, button) {
  const canSendRuntimeMessage =
    typeof chrome !== "undefined" &&
    chrome.runtime &&
    typeof chrome.runtime.sendMessage === "function";
  if (!canSendRuntimeMessage) {
    if (typeof showToast === "function") {
      showToast("フォルダ選択を開始できませんでした", "error");
    }
    return;
  }

  const originalText = button ? button.textContent : "";
  if (button) {
    button.disabled = true;
    button.textContent = "Selecting...";
  }

  chrome.runtime.sendMessage({ type: "chooseProjectFolder" }, (response) => {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
    if (chrome.runtime && chrome.runtime.lastError) {
      if (typeof showToast === "function") {
        showToast(chrome.runtime.lastError.message || "フォルダ選択に失敗しました", "error");
      }
      return;
    }
    if (!response || !response.ok) {
      const errMsg = (response && response.error) || "フォルダ選択に失敗しました";
      if (typeof showToast === "function") {
        showToast(errMsg, "error");
      }
      return;
    }
    const normalizedPath = cgptNormalizeProjectFolderPath(response.folderPath || "");
    persistProjectFolderSelection(input, normalizedPath);
  });
}
