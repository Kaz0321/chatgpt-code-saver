function ensureDefaultTemplates() {
  let templates = cgptGetTemplates();
  if (!Array.isArray(templates) || templates.length === 0) {
    const id = cgptGenerateTemplateId();
    templates = [
      {
        id,
        title: "コード出力ルール（基本）",
        content: DEFAULT_TEMPLATE_CONTENT,
      },
    ];
    cgptSetTemplates(templates);
    cgptSetSelectedTemplateId(id);
  } else if (!cgptGetSelectedTemplateId()) {
    cgptSetSelectedTemplateId(templates[0].id);
  }
}

function loadTemplatesFromStorage(callback) {
  chrome.runtime.sendMessage({ type: "getTemplates" }, (res) => {
    if (res && res.ok && Array.isArray(res.templates)) {
      cgptSetTemplates(res.templates);
    } else {
      cgptSetTemplates([]);
    }
    ensureDefaultTemplates();
    if (typeof callback === "function") callback();
  });
}

function saveTemplatesToStorage() {
  chrome.runtime.sendMessage(
    { type: "setTemplates", templates: cgptGetTemplates() },
    (res) => {
      if (!res || !res.ok) {
        console.error("Failed to save templates", res && res.error);
        showToast("テンプレートの保存に失敗しました。", "error");
      }
    }
  );
}

function getSelectedTemplate() {
  const templates = cgptGetTemplates();
  if (!Array.isArray(templates) || templates.length === 0) return null;
  const selectedId = cgptGetSelectedTemplateId();
  const found = templates.find((t) => t.id === selectedId);
  return found || templates[0];
}

function rebuildTemplateDropdown(selectEl) {
  if (!selectEl) return;

  while (selectEl.firstChild) {
    selectEl.removeChild(selectEl.firstChild);
  }

  const templates = cgptGetTemplates();
  let selectedId = cgptGetSelectedTemplateId();

  if (!Array.isArray(templates) || templates.length === 0) {
    selectEl.disabled = true;
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "テンプレートがありません";
    emptyOption.selected = true;
    selectEl.appendChild(emptyOption);
    return;
  }

  selectEl.disabled = false;
  const hasValidSelection = templates.some((tpl) => tpl.id === selectedId);
  if (!hasValidSelection) {
    selectedId = templates[0].id;
    cgptSetSelectedTemplateId(selectedId);
  }

  templates.forEach((tpl) => {
    const option = document.createElement("option");
    option.value = tpl.id;
    option.textContent = tpl.title;
    if (tpl.id === selectedId) {
      option.selected = true;
    }
    selectEl.appendChild(option);
  });
}

function insertTemplateToInput(templateText) {
  const inserted = cgptInsertTextToChatInput(templateText);
  if (!inserted) {
    alert("ChatGPTの入力欄が見つかりませんでした。");
    return;
  }
  showToast("テンプレートを貼り付けました。", "success");
}
