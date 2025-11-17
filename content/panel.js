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
