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

function rebuildTemplateList(listEl, onSelect) {
  if (!listEl) return;

  while (listEl.firstChild) {
    listEl.removeChild(listEl.firstChild);
  }

  const templates = cgptGetTemplates();
  const selectedId = cgptGetSelectedTemplateId();

  if (!Array.isArray(templates) || templates.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "テンプレートがありません";
    empty.style.fontSize = "10px";
    empty.style.color = "rgba(255,255,255,0.6)";
    empty.style.padding = "4px";
    listEl.appendChild(empty);
    return;
  }

  templates.forEach((tpl) => {
    const item = document.createElement("button");
    item.type = "button";
    item.textContent = tpl.title;
    item.style.display = "block";
    item.style.width = "100%";
    item.style.textAlign = "left";
    item.style.padding = "4px 6px";
    item.style.fontSize = "11px";
    item.style.borderRadius = "4px";
    item.style.border = "1px solid rgba(255,255,255,0.2)";
    item.style.background =
      tpl.id === selectedId ? "rgba(129, 140, 248, 0.35)" : "rgba(255,255,255,0.02)";
    item.style.color = "#fff";
    item.style.cursor = "pointer";

    item.addEventListener("click", () => {
      if (typeof onSelect === "function") {
        onSelect(tpl.id);
      } else {
        cgptSetSelectedTemplateId(tpl.id);
        rebuildTemplateList(listEl, onSelect);
      }
    });

    listEl.appendChild(item);
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
