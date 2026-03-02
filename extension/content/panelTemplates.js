function createTemplateSection() {
  const templateSection = document.createElement("div");
  templateSection.appendChild(createSectionLabel("Templates"));

  const templateRow = document.createElement("div");
  templateRow.style.display = "flex";
  templateRow.style.gap = "8px";
  templateRow.style.alignItems = "stretch";

  const templateDropdownContainer = document.createElement("div");
  templateDropdownContainer.style.flex = "1";
  templateDropdownContainer.style.position = "relative";
  templateDropdownContainer.style.display = "flex";
  templateDropdownContainer.style.alignItems = "center";
  templateDropdownContainer.style.border = "1px solid rgba(255,255,255,0.25)";
  templateDropdownContainer.style.borderRadius = "8px";
  templateDropdownContainer.style.background = "rgba(31, 41, 55, 0.95)";
  templateDropdownContainer.style.transition = "border-color 0.15s ease, background 0.15s ease";

  const templateDropdown = document.createElement("select");
  templateDropdown.style.flex = "1";
  templateDropdown.style.appearance = "none";
  templateDropdown.style.WebkitAppearance = "none";
  templateDropdown.style.MozAppearance = "none";
  templateDropdown.style.background = "transparent";
  templateDropdown.style.border = "none";
  templateDropdown.style.outline = "none";
  templateDropdown.style.padding = "6px 32px 6px 10px";
  templateDropdown.style.color = "#fff";
  templateDropdown.style.fontSize = "12px";
  templateDropdown.style.height = "32px";
  templateDropdown.style.cursor = "pointer";
  templateDropdown.setAttribute("aria-label", "Select template");
  templateDropdownContainer.appendChild(templateDropdown);

  const dropdownIcon = document.createElement("span");
  dropdownIcon.textContent = "▼";
  dropdownIcon.style.position = "absolute";
  dropdownIcon.style.right = "10px";
  dropdownIcon.style.pointerEvents = "none";
  dropdownIcon.style.color = "rgba(255,255,255,0.6)";
  dropdownIcon.style.fontSize = "10px";
  dropdownIcon.style.lineHeight = "1";
  templateDropdownContainer.appendChild(dropdownIcon);

  templateDropdown.addEventListener("focus", () => {
    templateDropdownContainer.style.borderColor = "#38bdf8";
    templateDropdownContainer.style.background = "rgba(15, 23, 42, 0.95)";
  });

  templateDropdown.addEventListener("blur", () => {
    templateDropdownContainer.style.borderColor = "rgba(255,255,255,0.25)";
    templateDropdownContainer.style.background = "rgba(31, 41, 55, 0.95)";
  });

  templateDropdownContainer.addEventListener("mouseenter", () => {
    templateDropdownContainer.style.borderColor = "rgba(255,255,255,0.5)";
  });

  templateDropdownContainer.addEventListener("mouseleave", () => {
    templateDropdownContainer.style.borderColor = "rgba(255,255,255,0.25)";
  });

  templateRow.appendChild(templateDropdownContainer);

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

  const editBtn = createPanelButton("Edit", "secondary");
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

  const addBtn = createPanelButton("Add", "secondary");
  addBtn.style.flex = "1";
  addBtn.addEventListener("click", () => {
    openTemplateEditor("new", null, () => {
      refreshTemplateList();
    });
  });
  manageRow.appendChild(addBtn);

  const insertBtn = createPanelButton("Insert", "primary");
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
