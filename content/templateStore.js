function ensureDefaultTemplates() {
  if (!Array.isArray(templates) || templates.length === 0) {
    const id = generateId();
    templates = [
      {
        id,
        title: "コード出力ルール（基本）",
        content: DEFAULT_TEMPLATE_CONTENT,
      },
    ];
    selectedTemplateId = id;
  } else if (!selectedTemplateId) {
    selectedTemplateId = templates[0].id;
  }
}

function loadTemplatesFromStorage(callback) {
  chrome.runtime.sendMessage({ type: "getTemplates" }, (res) => {
    if (res && res.ok && Array.isArray(res.templates)) {
      templates = res.templates;
    } else {
      templates = [];
    }
    ensureDefaultTemplates();
    if (typeof callback === "function") callback();
  });
}

function saveTemplatesToStorage() {
  chrome.runtime.sendMessage({ type: "setTemplates", templates }, (res) => {
    if (!res || !res.ok) {
      console.error("Failed to save templates", res && res.error);
      showToast("テンプレートの保存に失敗しました。", "error");
    }
  });
}

function getSelectedTemplate() {
  if (!Array.isArray(templates) || templates.length === 0) return null;
  const found = templates.find((t) => t.id === selectedTemplateId);
  return found || templates[0];
}

function rebuildTemplateSelect(selectEl) {
  while (selectEl.firstChild) {
    selectEl.removeChild(selectEl.firstChild);
  }
  templates.forEach((tpl) => {
    const opt = document.createElement("option");
    opt.value = tpl.id;
    opt.textContent = tpl.title;
    if (tpl.id === selectedTemplateId) {
      opt.selected = true;
    }
    selectEl.appendChild(opt);
  });
}

function findChatInputElement() {
  const selectors = [
    "div[contenteditable='true'][data-testid='textbox']",
    "div[contenteditable='true'][role='textbox']",
    "div[contenteditable='true']",
    "textarea[data-testid='chat-input']",
    "textarea",
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function insertTemplateToInput(templateText) {
  const input = findChatInputElement();
  if (!input) {
    alert("ChatGPTの入力欄が見つかりませんでした。");
    return;
  }

  if (input.tagName === "TEXTAREA") {
    const existing = input.value;
    const prefix =
      existing && existing.trim().length > 0
        ? existing.replace(/\s*$/, "") + "\n\n"
        : "";
    input.focus();
    input.value = prefix + templateText;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  } else {
    input.focus();
    const selection = window.getSelection();
    const doc = input.ownerDocument || document;
    const frag = doc.createDocumentFragment();

    const hasExisting =
      (input.textContent && input.textContent.trim().length > 0) ||
      (input.innerHTML &&
        input.innerHTML.replace(/<br\s*\/?>/gi, "").trim().length > 0);

    if (hasExisting) {
      frag.appendChild(doc.createElement("br"));
    }

    const lines = templateText.split("\n");
    lines.forEach((line, index) => {
      if (index > 0) {
        frag.appendChild(doc.createElement("br"));
      }
      if (line.length > 0) {
        frag.appendChild(doc.createTextNode(line));
      }
    });

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.collapse(false);
      range.insertNode(frag);
      selection.removeAllRanges();
      const rangeEnd = doc.createRange();
      rangeEnd.selectNodeContents(input);
      rangeEnd.collapse(false);
      selection.addRange(rangeEnd);
    } else {
      input.appendChild(frag);
    }
  }

  showToast("テンプレートを貼り付けました。", "success");
}
