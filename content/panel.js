function createFloatingPanel() {
  if (document.getElementById("cgpt-code-helper-panel")) return;

  const panel = document.createElement("div");
  panel.id = "cgpt-code-helper-panel";
  panel.style.position = "fixed";
  panel.style.right = "16px";
  panel.style.bottom = "80px";
  panel.style.zIndex = "9999";
  panel.style.background = "rgba(32, 33, 35, 0.95)";
  panel.style.border = "1px solid rgba(255,255,255,0.1)";
  panel.style.borderRadius = "8px";
  panel.style.padding = "12px";
  panel.style.fontSize = "12px";
  panel.style.color = "#fff";
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.gap = "8px";
  panel.style.backdropFilter = "blur(8px)";
  panel.style.maxWidth = "280px";

  const title = document.createElement("div");
  title.textContent = getHelperPanelTitle();
  title.style.fontWeight = "bold";
  title.style.fontSize = "13px";
  panel.appendChild(title);

  panel.appendChild(createProjectFolderSection());

  const templateSection = document.createElement("div");
  templateSection.appendChild(createSectionLabel("テンプレート"));

  const templateRow = document.createElement("div");
  templateRow.style.display = "flex";
  templateRow.style.gap = "8px";
  templateRow.style.alignItems = "flex-start";

  const templateLabel = document.createElement("span");
  templateLabel.textContent = "選択";
  templateLabel.style.fontSize = "11px";
  templateLabel.style.minWidth = "32px";
  templateRow.appendChild(templateLabel);

  const templateListWrapper = document.createElement("div");
  templateListWrapper.style.flex = "1";
  templateListWrapper.style.border = "1px solid rgba(255,255,255,0.2)";
  templateListWrapper.style.borderRadius = "6px";
  templateListWrapper.style.background = "rgba(31, 41, 55, 0.9)";
  templateListWrapper.style.padding = "6px";
  templateListWrapper.style.maxHeight = "150px";
  templateListWrapper.style.overflowY = "auto";

  const templateList = document.createElement("div");
  templateList.style.display = "flex";
  templateList.style.flexDirection = "column";
  templateList.style.gap = "4px";
  templateListWrapper.appendChild(templateList);
  templateRow.appendChild(templateListWrapper);

  const refreshTemplateList = () => {
    rebuildTemplateList(templateList, (templateId) => {
      cgptSetSelectedTemplateId(templateId);
      refreshTemplateList();
    });
  };
  refreshTemplateList();

  templateSection.appendChild(templateRow);

  const manageRow = createButtonRow();
  const editBtn = createPanelButton("編集", "success");
  editBtn.style.flex = "1";
  editBtn.addEventListener("click", () => {
    const tpl = getSelectedTemplate();
    if (!tpl) {
      alert("テンプレートがありません。");
      return;
    }
    openTemplateEditor("edit", tpl.id, () => {
      refreshTemplateList();
    });
  });
  manageRow.appendChild(editBtn);

  const addBtn = createPanelButton("追加", "success");
  addBtn.style.flex = "1";
  addBtn.addEventListener("click", () => {
    openTemplateEditor("new", null, () => {
      refreshTemplateList();
    });
  });
  manageRow.appendChild(addBtn);

  const insertBtn = createPanelButton("貼付け", "accent");
  insertBtn.style.flex = "1";
  insertBtn.addEventListener("click", () => {
    const tpl = getSelectedTemplate();
    if (!tpl) {
      alert("テンプレートがありません。");
      return;
    }
    insertTemplateToInput(tpl.content);
  });
  manageRow.appendChild(insertBtn);
  templateSection.appendChild(manageRow);
  panel.appendChild(templateSection);

  const viewSection = document.createElement("div");
  viewSection.appendChild(createSectionLabel("コード表示"));
  const settings = getViewSettingsForPanel();

  const compactRow = createLineCountRow("縮小行数", settings.compactLineCount, (value) => {
    if (typeof cgptUpdateViewSettings === "function") {
      cgptUpdateViewSettings({ compactLineCount: value }, () => {
        if (typeof cgptReapplyViewMode === "function") {
          cgptReapplyViewMode("compact");
        }
      });
    }
  });
  viewSection.appendChild(compactRow);

  const collapsedRow = createLineCountRow("折りたたみ行数", settings.collapsedLineCount, (value) => {
    if (typeof cgptUpdateViewSettings === "function") {
      cgptUpdateViewSettings({ collapsedLineCount: value }, () => {
        if (typeof cgptReapplyViewMode === "function") {
          cgptReapplyViewMode("collapsed");
        }
      });
    }
  });
  viewSection.appendChild(collapsedRow);

  const viewButtons = createButtonRow();
  const shrinkAllBtn = createPanelButton("全て縮小", "muted");
  shrinkAllBtn.addEventListener("click", () => {
    applyViewModeToAll("compact");
  });
  viewButtons.appendChild(shrinkAllBtn);

  const collapseAllBtn = createPanelButton("全て折りたたみ", "accent");
  collapseAllBtn.addEventListener("click", () => {
    applyViewModeToAll("collapsed");
  });
  viewButtons.appendChild(collapseAllBtn);

  const expandAllBtn = createPanelButton("全て展開", "secondary");
  expandAllBtn.addEventListener("click", () => {
    applyViewModeToAll("expanded");
  });
  viewButtons.appendChild(expandAllBtn);
  viewSection.appendChild(viewButtons);
  panel.appendChild(viewSection);

  const logSection = document.createElement("div");
  logSection.appendChild(createSectionLabel("履歴・ログ"));
  const logButtons = createButtonRow();

  const chatLogBtn = createPanelButton("チャットログ", "accent");
  chatLogBtn.style.flex = "1";
  chatLogBtn.addEventListener("click", () => {
    if (typeof openChatLogModal === "function") {
      openChatLogModal();
    } else {
      alert("チャットログビューを開けませんでした。");
    }
  });
  logButtons.appendChild(chatLogBtn);

  const historyBtn = createPanelButton("保存ログ", "secondary");
  historyBtn.style.flex = "1";
  historyBtn.addEventListener("click", () => {
    openLogViewer();
  });
  logButtons.appendChild(historyBtn);
  logSection.appendChild(logButtons);
  panel.appendChild(logSection);

  document.body.appendChild(panel);
}

function createSectionLabel(text) {
  const label = document.createElement("div");
  label.textContent = text;
  label.style.fontSize = "11px";
  label.style.fontWeight = "bold";
  label.style.marginBottom = "2px";
  label.style.color = "rgba(255,255,255,0.8)";
  return label;
}

function createPanelButton(text, variant = "secondary") {
  const button = document.createElement("button");
  button.textContent = text;
  button.style.fontSize = "11px";
  button.style.padding = "4px 6px";
  button.style.borderRadius = "4px";
  button.style.border = "1px solid rgba(255,255,255,0.2)";
  button.style.cursor = "pointer";
  button.style.flexShrink = "0";
  applyPanelButtonVariant(button, variant);
  return button;
}

function applyPanelButtonVariant(button, variant) {
  const palette = {
    primary: "rgba(59, 130, 246, 0.95)",
    accent: "rgba(129, 140, 248, 0.95)",
    success: "rgba(16, 185, 129, 0.95)",
    secondary: "rgba(55, 65, 81, 0.9)",
    muted: "rgba(75, 85, 99, 0.9)",
  };
  const color = palette[variant] || palette.secondary;
  button.style.background = color;
  button.style.color = "#fff";
}

function getHelperPanelTitle() {
  const manifest =
    typeof chrome !== "undefined" &&
    chrome.runtime &&
    typeof chrome.runtime.getManifest === "function"
      ? chrome.runtime.getManifest()
      : null;
  const extensionName =
    manifest && manifest.name ? manifest.name : "gpt-code-saver-extension";
  const version = manifest && manifest.version ? manifest.version : "";
  if (!version) {
    return extensionName;
  }
  return `${extensionName} ${version}`;
}

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
  const selectBtn = createPanelButton("フォルダ選択", "accent");
  selectBtn.style.flex = "1";
  selectBtn.addEventListener("click", () => {
    requestProjectFolderSelection(input, selectBtn);
  });
  buttons.appendChild(selectBtn);

  const saveBtn = createPanelButton("保存", "success");
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
  if (!chrome || !chrome.runtime || typeof chrome.runtime.sendMessage !== "function") {
    if (typeof showToast === "function") {
      showToast("フォルダ選択を開始できませんでした", "error");
    }
    return;
  }

  const originalText = button ? button.textContent : "";
  if (button) {
    button.disabled = true;
    button.textContent = "選択中...";
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

function createButtonRow() {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "4px";
  row.style.width = "100%";
  return row;
}

function createLineCountRow(labelText, initialValue, onCommit) {
  const MIN_LINES = 1;
  const MAX_LINES = 200;

  const row = document.createElement("label");
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.gap = "8px";
  row.style.fontSize = "11px";
  row.style.color = "rgba(255,255,255,0.8)";

  const span = document.createElement("span");
  span.textContent = labelText;
  span.style.flex = "1";
  row.appendChild(span);

  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.alignItems = "center";
  controls.style.gap = "4px";

  const input = document.createElement("input");
  input.type = "number";
  input.min = `${MIN_LINES}`;
  input.max = `${MAX_LINES}`;
  input.value = `${initialValue}`;
  input.style.width = "64px";
  input.style.borderRadius = "4px";
  input.style.border = "1px solid rgba(255,255,255,0.2)";
  input.style.background = "#1f2937";
  input.style.color = "#fff";
  input.style.padding = "2px 4px";
  input.style.textAlign = "center";

  const createAdjustButton = (label) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.style.width = "28px";
    button.style.height = "24px";
    button.style.borderRadius = "4px";
    button.style.border = "1px solid rgba(255,255,255,0.2)";
    button.style.background = "rgba(55, 65, 81, 0.95)";
    button.style.color = "#fff";
    button.style.cursor = "pointer";
    button.style.display = "flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    return button;
  };

  const clampValue = (value) => {
    return Math.max(MIN_LINES, Math.min(MAX_LINES, value));
  };

  const commitValue = () => {
    const parsed = clampValue(Number.parseInt(input.value, 10) || MIN_LINES);
    input.value = `${parsed}`;
    onCommit(parsed);
  };

  const adjustValue = (delta) => {
    const current = clampValue(Number.parseInt(input.value, 10) || MIN_LINES);
    const nextValue = clampValue(current + delta);
    if (nextValue === current) return;
    input.value = `${nextValue}`;
    onCommit(nextValue);
  };

  const decrementButton = createAdjustButton("-");
  decrementButton.addEventListener("click", () => adjustValue(-1));
  controls.appendChild(decrementButton);

  input.addEventListener("change", commitValue);
  input.addEventListener("blur", commitValue);
  controls.appendChild(input);

  const incrementButton = createAdjustButton("+");
  incrementButton.addEventListener("click", () => adjustValue(1));
  controls.appendChild(incrementButton);

  row.appendChild(controls);
  return row;
}

function getViewSettingsForPanel() {
  if (typeof cgptGetViewSettings === "function") {
    return cgptGetViewSettings();
  }
  return { compactLineCount: 1, collapsedLineCount: 12 };
}

function applyViewModeToAll(mode) {
  if (typeof cgptApplyViewModeToAll === "function") {
    cgptApplyViewModeToAll(mode);
  }
}
