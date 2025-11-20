function cgptResolveDefaultTemplateContent() {
  if (typeof cgptGetDefaultTemplateContent === "function") {
    return cgptGetDefaultTemplateContent();
  }
  if (typeof DEFAULT_TEMPLATE_CONTENT !== "undefined") {
    return DEFAULT_TEMPLATE_CONTENT;
  }
  return "";
}

function openTemplateEditor(mode, templateId, onSave) {
  if (document.getElementById("cgpt-helper-template-modal")) return;

  let targetTemplate = null;
  if (mode === "edit") {
    const templates = cgptGetTemplates();
    targetTemplate = templates.find((t) => t.id === templateId);
    if (!targetTemplate) {
      alert("Template not found.");
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
  title.textContent = mode === "edit" ? "Edit Template" : "Add Template";
  title.style.fontWeight = "bold";
  dialog.appendChild(title);

  const titleLabel = document.createElement("div");
  titleLabel.textContent = "Title";
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
  textareaLabel.textContent = "Content";
  textareaLabel.style.fontSize = "11px";
  dialog.appendChild(textareaLabel);

  const textarea = document.createElement("textarea");
  textarea.value =
    mode === "edit" && targetTemplate
      ? targetTemplate.content
      : cgptResolveDefaultTemplateContent();
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
    deleteBtn.textContent = "Delete";
    deleteBtn.style.padding = "4px 10px";
    deleteBtn.style.borderRadius = "4px";
    deleteBtn.style.border = "1px solid rgba(255,255,255,0.3)";
    deleteBtn.style.background = "#b00020";
    deleteBtn.style.color = "#fff";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.addEventListener("click", () => {
      if (confirm("Delete this template?")) {
        const templates = cgptGetTemplates().filter(
          (t) => t.id !== templateId
        );
        cgptSetTemplates(templates);
        if (templates.length === 0) {
          ensureDefaultTemplates();
        }
        const updatedTemplates = cgptGetTemplates();
        if (updatedTemplates.length > 0) {
          cgptSetSelectedTemplateId(updatedTemplates[0].id);
        }
        saveTemplatesToStorage();
        if (typeof onSave === "function") onSave();
        document.body.removeChild(overlay);
        showToast("Template deleted.", "success");
      }
    });
    leftButtons.appendChild(deleteBtn);
  }

  buttonRow.appendChild(leftButtons);

  const rightButtons = document.createElement("div");
  rightButtons.style.display = "flex";
  rightButtons.style.gap = "8px";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
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
  saveBtn.textContent = "Save";
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
      alert("Please enter a title.");
      return;
    }

    if (mode === "edit" && targetTemplate) {
      targetTemplate.title = newTitle;
      targetTemplate.content = newContent;
      cgptSetSelectedTemplateId(targetTemplate.id);
    } else if (mode === "new") {
      const id = cgptGenerateTemplateId();
      const newTpl = { id: id, title: newTitle, content: newContent };
      const templates = [...cgptGetTemplates(), newTpl];
      cgptSetTemplates(templates);
      cgptSetSelectedTemplateId(id);
    }

    ensureDefaultTemplates();
    saveTemplatesToStorage();
    if (typeof onSave === "function") onSave();
    document.body.removeChild(overlay);
    showToast("Template saved.", "success");
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
