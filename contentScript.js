// file: chatgpt-code-apply-helper/contentScript.js
// ChatGPT Code Apply Helper - content script v0.0.9 + ログ + 自己リロード通知

const DEFAULT_TEMPLATE_CONTENT = `【コード出力ルール】
- 1行目に "// file: /Volumes/data/Users/soneky/Downloads/chatgpt-code-apply-helper/ファイル名.ext" または "# file: 相対/パス/ファイル名.ext" を書いてください。
- 2行目以降をファイル内容として扱ってください。
- 1ファイルにつき1つのコードブロックを使ってください。
`;

let templates = [];
let selectedTemplateId = null;

/** シンプルなトースト通知（自動でフェードアウト・OK不要） */
function showToast(message, type = "info") {
  try {
    const existing = document.getElementById("cgpt-helper-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "cgpt-helper-toast";
    toast.textContent = message;

    toast.style.position = "fixed";
    toast.style.bottom = "24px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.zIndex = "10001";
    toast.style.padding = "8px 14px";
    toast.style.borderRadius = "999px";
    toast.style.fontSize = "12px";
    toast.style.color = "#fff";
    toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.2s ease";

    if (type === "error") {
      toast.style.background = "rgba(220, 53, 69, 0.95)";
    } else if (type === "success") {
      toast.style.background = "rgba(16, 163, 127, 0.95)";
    } else {
      toast.style.background = "rgba(32, 33, 35, 0.95)";
    }

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = "1";
    });

    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        toast.remove();
      }, 200);
    }, 2000);
  } catch (e) {
    console.warn("showToast error", e);
  }
}

/** 拡張Aがリロードされたかどうかをチェックして、初回だけ通知 */
function checkAndNotifyReloaded() {
  try {
    chrome.storage.local.get(
      ["lastReloadedAt", "lastReloadedNotifiedAt"],
      (res) => {
        const lastReloadedAt = res.lastReloadedAt || null;
        const lastReloadedNotifiedAt = res.lastReloadedNotifiedAt || null;

        if (!lastReloadedAt) {
          return;
        }
        if (lastReloadedNotifiedAt === lastReloadedAt) {
          return; // 既にこのリロードは通知済み
        }

        let timeStr = lastReloadedAt;
        const d = new Date(lastReloadedAt);
        if (!isNaN(d.getTime())) {
          timeStr = d.toLocaleString();
        }

        showToast(`ChatGPT Helper 拡張がリロードされました (${timeStr})`, "success");

        chrome.storage.local.set({
          lastReloadedNotifiedAt: lastReloadedAt,
        });
      }
    );
  } catch (e) {
    console.warn("checkAndNotifyReloaded error", e);
  }
}

function generateId() {
  return "tpl_" + Math.random().toString(36).slice(2);
}

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

function getSelectedTemplate() {
  if (!Array.isArray(templates) || templates.length === 0) return null;
  const found = templates.find((t) => t.id === selectedTemplateId);
  return found || templates[0];
}

function rebuildTemplateSelect(selectEl) {
  while (selectEl.firstChild) {
    selectEl.removeAllRanges;
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

function openTemplateEditor(mode, templateId, onSave) {
  if (document.getElementById("cgpt-helper-template-modal")) return;

  let targetTemplate = null;
  if (mode === "edit") {
    targetTemplate = templates.find((t) => t.id === templateId);
    if (!targetTemplate) {
      alert("テンプレートが見つかりません。");
      return;
    }
  }

  const overlay = document.createElement("div");
  overlay.id = "cgpt-helper-template-modal";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0, 0, 0, 0.6)";
  overlay.style.zIndex = "10000";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";

  const dialog = document.createElement("div");
  dialog.style.background = "#202123";
  dialog.style.color = "#fff";
  dialog.style.borderRadius = "8px";
  dialog.style.padding = "12px";
  dialog.style.width = "80%";
  dialog.style.maxWidth = "800px";
  dialog.style.maxHeight = "80%";
  dialog.style.display = "flex";
  dialog.style.flexDirection = "column";
  dialog.style.gap = "8px";
  dialog.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5)";

  const title = document.createElement("div");
  title.textContent = mode === "edit" ? "テンプレート編集" : "テンプレート追加";
  title.style.fontWeight = "bold";
  dialog.appendChild(title);

  const titleLabel = document.createElement("div");
  titleLabel.textContent = "タイトル";
  titleLabel.style.fontSize = "11px";
  dialog.appendChild(titleLabel);

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.style.width = "100%";
  titleInput.style.boxSizing = "border-box";
  titleInput.style.padding = "4px 6px";
  titleInput.style.borderRadius = "4px";
  titleInput.style.border = "1px solid #555";
  titleInput.style.background = "#343541";
  titleInput.style.color = "#fff";
  titleInput.value =
    mode === "edit" && targetTemplate ? targetTemplate.title : "";
  dialog.appendChild(titleInput);

  const textareaLabel = document.createElement("div");
  textareaLabel.textContent = "内容";
  textareaLabel.style.fontSize = "11px";
  dialog.appendChild(textareaLabel);

  const textarea = document.createElement("textarea");
  textarea.value =
    mode === "edit" && targetTemplate
      ? targetTemplate.content
      : DEFAULT_TEMPLATE_CONTENT;
  textarea.style.width = "100%";
  textarea.style.flex = "1";
  textarea.style.minHeight = "200px";
  textarea.style.resize = "both";
  textarea.style.background = "#343541";
  textarea.style.color = "#fff";
  textarea.style.border = "1px solid #555";
  textarea.style.borderRadius = "4px";
  textarea.style.fontFamily = "monospace";
  textarea.style.fontSize = "12px";
  textarea.spellcheck = false;
  dialog.appendChild(textarea);

  const buttonRow = document.createElement("div");
  buttonRow.style.display = "flex";
  buttonRow.style.justifyContent = "space-between";
  buttonRow.style.gap = "8px";

  const leftButtons = document.createElement("div");
  leftButtons.style.display = "flex";
  leftButtons.style.gap = "8px";

  if (mode === "edit") {
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "削除";
    deleteBtn.style.padding = "4px 10px";
    deleteBtn.style.borderRadius = "4px";
    deleteBtn.style.border = "1px solid rgba(255,255,255,0.3)";
    deleteBtn.style.background = "#b00020";
    deleteBtn.style.color = "#fff";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.addEventListener("click", () => {
      if (confirm("このテンプレートを削除しますか？")) {
        templates = templates.filter((t) => t.id !== templateId);
        if (templates.length === 0) {
          ensureDefaultTemplates();
        }
        selectedTemplateId = templates[0].id;
        saveTemplatesToStorage();
        if (typeof onSave === "function") onSave();
        document.body.removeChild(overlay);
        showToast("テンプレートを削除しました。", "success");
      }
    });
    leftButtons.appendChild(deleteBtn);
  }

  buttonRow.appendChild(leftButtons);

  const rightButtons = document.createElement("div");
  rightButtons.style.display = "flex";
  rightButtons.style.gap = "8px";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "キャンセル";
  cancelBtn.style.padding = "4px 10px";
  cancelBtn.style.borderRadius = "4px";
  cancelBtn.style.border = "1px solid rgba(255,255,255,0.3)";
  cancelBtn.style.background = "#444";
  cancelBtn.style.color = "#fff";
  cancelBtn.style.cursor = "pointer";
  cancelBtn.addEventListener("click", () => {
    document.body.removeChild(overlay);
  });
  rightButtons.appendChild(cancelBtn);

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "保存";
  saveBtn.style.padding = "4px 10px";
  saveBtn.style.borderRadius = "4px";
  saveBtn.style.border = "1px solid rgba(255,255,255,0.3)";
  saveBtn.style.background = "rgba(16, 163, 127, 0.9)";
  saveBtn.style.color = "#fff";
  saveBtn.style.cursor = "pointer";
  saveBtn.addEventListener("click", () => {
    const newTitle = titleInput.value.trim();
    const newContent = textarea.value;

    if (!newTitle) {
      alert("タイトルを入力してください。");
      return;
    }

    if (mode === "edit" && targetTemplate) {
      targetTemplate.title = newTitle;
      targetTemplate.content = newContent;
      selectedTemplateId = targetTemplate.id;
    } else if (mode === "new") {
      const id = generateId();
      const newTpl = { id: id, title: newTitle, content: newContent };
      templates.push(newTpl);
      selectedTemplateId = id;
    }

    ensureDefaultTemplates();
    saveTemplatesToStorage();
    if (typeof onSave === "function") onSave();
    document.body.removeChild(overlay);
    showToast("テンプレートを保存しました。", "success");
  });
  rightButtons.appendChild(saveBtn);

  buttonRow.appendChild(rightButtons);
  dialog.appendChild(buttonRow);

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });
}

/** ログ閲覧モーダル */
function openLogViewer() {
  if (document.getElementById("cgpt-helper-log-modal")) return;

  chrome.runtime.sendMessage({ type: "getLogs" }, (res) => {
    if (!res || !res.ok) {
      showToast("ログの取得に失敗しました。", "error");
      return;
    }
    const logs = Array.isArray(res.logs) ? res.logs.slice().reverse() : [];

    const overlay = document.createElement("div");
    overlay.id = "cgpt-helper-log-modal";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0, 0, 0, 0.6)";
    overlay.style.zIndex = "10000";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";

    const dialog = document.createElement("div");
    dialog.style.background = "#202123";
    dialog.style.color = "#fff";
    dialog.style.borderRadius = "8px";
    dialog.style.padding = "12px";
    dialog.style.width = "80%";
    dialog.style.maxWidth = "800px";
    dialog.style.maxHeight = "80%";
    dialog.style.display = "flex";
    dialog.style.flexDirection = "column";
    dialog.style.gap = "8px";
    dialog.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5)";

    const headerRow = document.createElement("div");
    headerRow.style.display = "flex";
    headerRow.style.justifyContent = "space-between";
    headerRow.style.alignItems = "center";

    const title = document.createElement("div");
    title.textContent = "保存ログ";
    title.style.fontWeight = "bold";
    headerRow.appendChild(title);

    const headerButtons = document.createElement("div");
    headerButtons.style.display = "flex";
    headerButtons.style.gap = "8px";

    const clearBtn = document.createElement("button");
    clearBtn.textContent = "ログをクリア";
    clearBtn.style.fontSize = "11px";
    clearBtn.style.padding = "4px 8px";
    clearBtn.style.borderRadius = "4px";
    clearBtn.style.border = "1px solid rgba(255,255,255,0.3)";
    clearBtn.style.background = "#b00020";
    clearBtn.style.color = "#fff";
    clearBtn.style.cursor = "pointer";
    clearBtn.addEventListener("click", () => {
      if (!confirm("ログをすべて削除しますか？")) return;
      chrome.runtime.sendMessage({ type: "clearLogs" }, (res2) => {
        if (!res2 || !res2.ok) {
          showToast("ログの削除に失敗しました。", "error");
          return;
        }
        list.innerHTML = "";
        list.appendChild(document.createTextNode("ログはありません。"));
        showToast("ログを削除しました。", "success");
      });
    });
    headerButtons.appendChild(clearBtn);

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "閉じる";
    closeBtn.style.fontSize = "11px";
    closeBtn.style.padding = "4px 8px";
    closeBtn.style.borderRadius = "4px";
    closeBtn.style.border = "1px solid rgba(255,255,255,0.3)";
    closeBtn.style.background = "#444";
    closeBtn.style.color = "#fff";
    closeBtn.style.cursor = "pointer";
    closeBtn.addEventListener("click", () => {
      document.body.removeChild(overlay);
    });
    headerButtons.appendChild(closeBtn);

    headerRow.appendChild(headerButtons);
    dialog.appendChild(headerRow);

    const list = document.createElement("div");
    list.style.flex = "1";
    list.style.overflow = "auto";
    list.style.fontFamily = "monospace";
    list.style.fontSize = "11px";
    list.style.border = "1px solid #444";
    list.style.borderRadius = "4px";
    list.style.padding = "6px";
    list.style.background = "#18181b";
    list.style.whiteSpace = "pre-wrap";

    if (logs.length === 0) {
      list.textContent = "ログはありません。";
    } else {
      logs.forEach((entry) => {
        const line = document.createElement("div");

        const time = entry.time || "";
        const d = time ? new Date(time) : null;
        const timeStr =
          d && !isNaN(d.getTime()) ? d.toLocaleString() : time;

        const ok = entry.ok;
        const kind = entry.kind || "apply";
        const filePath = entry.filePath || "";
        const error = entry.error || "";

        const statusLabel = ok ? "[OK]" : "[ERROR]";

        line.textContent = `${timeStr} ${statusLabel} (${kind}) ${filePath}${
          error ? " - " + error : ""
        }`;
        line.style.color = ok ? "#a7f3d0" : "#fecaca";
        list.appendChild(line);
      });
    }

    dialog.appendChild(list);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
  });
}

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
  panel.style.padding = "8px";
  panel.style.fontSize = "12px";
  panel.style.color = "#fff";
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.gap = "4px";
  panel.style.backdropFilter = "blur(8px)";
  panel.style.maxWidth = "280px";

  const title = document.createElement("div");
  title.textContent = "ChatGPT Helper";
  title.style.fontWeight = "bold";
  title.style.marginBottom = "4px";
  panel.appendChild(title);

  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "4px";
  row.style.alignItems = "center";

  const label = document.createElement("span");
  label.textContent = "テンプレ:";
  label.style.fontSize = "11px";
  row.appendChild(label);

  const select = document.createElement("select");
  select.style.flex = "1";
  select.style.fontSize = "11px";
  select.style.padding = "2px 4px";
  select.style.borderRadius = "4px";
  select.style.border = "1px solid rgba(255,255,255,0.3)";
  select.style.background = "#343541";
  select.style.color = "#fff";
  row.appendChild(select);

  rebuildTemplateSelect(select);

  select.addEventListener("change", () => {
    selectedTemplateId = select.value;
  });

  panel.appendChild(row);

  const insertBtn = document.createElement("button");
  insertBtn.textContent = "選択テンプレ貼り付け";
  insertBtn.style.fontSize = "11px";
  insertBtn.style.padding = "4px 6px";
  insertBtn.style.borderRadius = "4px";
  insertBtn.style.border = "1px solid rgba(255,255,255,0.3)";
  insertBtn.style.background = "rgba(66, 133, 244, 0.9)";
  insertBtn.style.color = "#fff";
  insertBtn.style.cursor = "pointer";
  insertBtn.addEventListener("click", () => {
    const tpl = getSelectedTemplate();
    if (!tpl) {
      alert("テンプレートがありません。");
      return;
    }
    insertTemplateToInput(tpl.content);
  });
  panel.appendChild(insertBtn);

  const manageRow = document.createElement("div");
  manageRow.style.display = "flex";
  manageRow.style.gap = "4px";

  const editBtn = document.createElement("button");
  editBtn.textContent = "編集";
  editBtn.style.flex = "1";
  editBtn.style.fontSize = "11px";
  editBtn.style.padding = "4px 6px";
  editBtn.style.borderRadius = "4px";
  editBtn.style.border = "1px solid rgba(255,255,255,0.3)";
  editBtn.style.background = "rgba(90, 90, 90, 0.9)";
  editBtn.style.color = "#fff";
  editBtn.style.cursor = "pointer";
  editBtn.addEventListener("click", () => {
    const tpl = getSelectedTemplate();
    if (!tpl) {
      alert("テンプレートがありません。");
      return;
    }
    openTemplateEditor("edit", tpl.id, () => {
      rebuildTemplateSelect(select);
    });
  });
  manageRow.appendChild(editBtn);

  const addBtn = document.createElement("button");
  addBtn.textContent = "追加";
  addBtn.style.flex = "1";
  addBtn.style.fontSize = "11px";
  addBtn.style.padding = "4px 6px";
  addBtn.style.borderRadius = "4px";
  addBtn.style.border = "1px solid rgba(255,255,255,0.3)";
  addBtn.style.background = "rgba(16, 163, 127, 0.9)";
  addBtn.style.color = "#fff";
  addBtn.style.cursor = "pointer";
  addBtn.addEventListener("click", () => {
    openTemplateEditor("new", null, () => {
      rebuildTemplateSelect(select);
    });
  });
  manageRow.appendChild(addBtn);

  panel.appendChild(manageRow);

  const logBtn = document.createElement("button");
  logBtn.textContent = "ログ";
  logBtn.style.fontSize = "11px";
  logBtn.style.padding = "4px 6px";
  logBtn.style.borderRadius = "4px";
  logBtn.style.border = "1px solid rgba(255,255,255,0.3)";
  logBtn.style.background = "rgba(55, 65, 81, 0.9)";
  logBtn.style.color = "#fff";
  logBtn.style.cursor = "pointer";
  logBtn.addEventListener("click", () => {
    openLogViewer();
  });
  panel.appendChild(logBtn);

  const reloadBtn = document.createElement("button");
  reloadBtn.textContent = "この拡張をリロード";
  reloadBtn.style.fontSize = "11px";
  reloadBtn.style.padding = "4px 6px";
  reloadBtn.style.borderRadius = "4px";
  reloadBtn.style.border = "1px solid rgba(255,255,255,0.3)";
  reloadBtn.style.background = "rgba(244, 180, 0, 0.9)";
  reloadBtn.style.color = "#000";
  reloadBtn.style.cursor = "pointer";
  reloadBtn.style.marginTop = "4px";
  reloadBtn.addEventListener("click", () => {
    if (confirm("ChatGPT Code Apply Helper 拡張をリロードしますか？")) {
      chrome.runtime.sendMessage({ type: "reloadExtension" });
    }
  });
  panel.appendChild(reloadBtn);

  document.body.appendChild(panel);
}

function decorateCodeBlocks(root = document) {
  const pres = root.querySelectorAll("pre code");
  pres.forEach((code) => {
    const pre = code.closest("pre");
    if (!pre) return;
    if (pre.dataset.cgptCodeHelperApplied === "1") return;
    pre.dataset.cgptCodeHelperApplied = "1";

    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const applyBtn = document.createElement("button");
    applyBtn.textContent = "Apply to project";
    applyBtn.style.position = "absolute";
    applyBtn.style.top = "4px";
    applyBtn.style.right = "4px";
    applyBtn.style.fontSize = "11px";
    applyBtn.style.padding = "2px 6px";
    applyBtn.style.borderRadius = "4px";
    applyBtn.style.border = "1px solid rgba(255,255,255,0.4)";
    applyBtn.style.background = "rgba(15, 157, 88, 0.9)";
    applyBtn.style.color = "#fff";
    applyBtn.style.cursor = "pointer";
    applyBtn.style.zIndex = "1";

    applyBtn.addEventListener("click", () => {
      const text = code.innerText || "";
      const normalized = text.replace(/\r\n/g, "\n");
      const lines = normalized.split("\n");
      if (!lines.length) {
        alert("コードブロックが空です。");
        return;
      }
      const first = lines[0].trim();
      const m =
        first.match(/^\/\/\s*file:\s*(.+)$/i) ||
        first.match(/^#\s*file:\s*(.+)$/i);
      if (!m) {
        alert("1行目に '// file: パス' または '# file: パス' を含めてください。");
        return;
      }
      const filePath = m[1].trim();
      if (!filePath) {
        alert("file パスが空です。");
        return;
      }
      const content = lines.slice(1).join("\n");

      chrome.runtime.sendMessage(
        { type: "applyCodeBlock", filePath: filePath, content: content },
        (res) => {
          if (!res || !res.ok) {
            showToast(
              "保存に失敗しました: " +
                (res && res.error ? res.error : "unknown error"),
              "error"
            );
          } else {
            const original = applyBtn.textContent;
            applyBtn.textContent = "Saved!";
            setTimeout(() => {
              applyBtn.textContent = original;
            }, 1500);
            showToast(`保存しました: ${filePath}`, "success");
          }
        }
      );
    });

    wrapper.appendChild(applyBtn);
  });
}

function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length > 0) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            decorateCodeBlocks(node);
          }
        });
      }
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function init() {
  // 拡張Aのリロード完了通知
  checkAndNotifyReloaded();

  loadTemplatesFromStorage(() => {
    createFloatingPanel();
    decorateCodeBlocks(document);
    setupMutationObserver();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
