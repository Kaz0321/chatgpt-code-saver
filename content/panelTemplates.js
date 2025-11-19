function createTemplateSection() {
  const templateSection = document.createElement("div");
  templateSection.appendChild(createSectionLabel("Templates"));

  const templateRow = document.createElement("div");
  templateRow.style.display = "flex";
  templateRow.style.gap = "8px";
  templateRow.style.alignItems = "stretch";

  const templateDropdown = document.createElement("select");
  templateDropdown.style.flex = "1";
  templateDropdown.style.border = "1px solid rgba(255,255,255,0.2)";
  templateDropdown.style.borderRadius = "6px";
  templateDropdown.style.background = "rgba(31, 41, 55, 0.9)";
  templateDropdown.style.padding = "6px";
  templateDropdown.style.color = "#fff";
  templateDropdown.style.fontSize = "12px";
  templateDropdown.style.height = "32px";
  templateDropdown.style.cursor = "pointer";
  templateDropdown.setAttribute("aria-label", "Select template");
  templateRow.appendChild(templateDropdown);

  templateDropdown.addEventListener("change", (event) => {
    const templateId = event.target.value;
    if (templateId) {
      cgptSetSelectedTemplateId(templateId);
    }
  });

  const refreshTemplateList = () => {
    rebuildTemplateDropdown(templateDropdown);
  };
  refreshTemplateList();

  templateSection.appendChild(templateRow);
  templateSection.appendChild(createTemplateActionRow(refreshTemplateList));
  return templateSection;
}

function createTemplateActionRow(refreshTemplateList) {
  const manageRow = createButtonRow();

  const editBtn = createPanelButton("Edit", "success");
  editBtn.style.flex = "1";
  editBtn.addEventListener("click", () => {
    const tpl = getSelectedTemplate();
    if (!tpl) {
      alert("No templates available.");
      return;
    }
    openTemplateEditor("edit", tpl.id, () => {
      refreshTemplateList();
    });
  });
  manageRow.appendChild(editBtn);

  const addBtn = createPanelButton("Add", "success");
  addBtn.style.flex = "1";
  addBtn.addEventListener("click", () => {
    openTemplateEditor("new", null, () => {
      refreshTemplateList();
    });
  });
  manageRow.appendChild(addBtn);

  const insertBtn = createPanelButton("Insert", "accent");
  insertBtn.style.flex = "1";
  insertBtn.addEventListener("click", () => {
    const tpl = getSelectedTemplate();
    if (!tpl) {
      alert("No templates available.");
      return;
    }
    insertTemplateToInput(tpl.content);
  });
  manageRow.appendChild(insertBtn);

  return manageRow;
}
