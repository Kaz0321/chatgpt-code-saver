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
  templateDropdownContainer.style.borderRadius = "8px";
  templateDropdownContainer.style.transition = "border-color 0.15s ease, background 0.15s ease";
  if (typeof cgptApplySurfaceStyle === "function") {
    cgptApplySurfaceStyle(templateDropdownContainer, "subtle");
  } else {
    templateDropdownContainer.style.border = "1px solid rgba(255,255,255,0.25)";
    templateDropdownContainer.style.background = "rgba(31, 41, 55, 0.95)";
  }

  const templateDropdown = document.createElement("select");
  templateDropdown.style.flex = "1";
  templateDropdown.style.appearance = "none";
  templateDropdown.style.WebkitAppearance = "none";
  templateDropdown.style.MozAppearance = "none";
  templateDropdown.style.background = "transparent";
  templateDropdown.style.border = "none";
  templateDropdown.style.outline = "none";
  templateDropdown.style.padding = "6px 32px 6px 10px";
  if (typeof cgptApplyPanelTextTone === "function") {
    cgptApplyPanelTextTone(templateDropdown, "primary");
  } else {
    templateDropdown.style.color = "#fff";
  }
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
  if (typeof cgptApplyPanelTextTone === "function") {
    cgptApplyPanelTextTone(dropdownIcon, "muted");
  } else {
    dropdownIcon.style.color = "rgba(255,255,255,0.6)";
  }
  dropdownIcon.style.fontSize = "10px";
  dropdownIcon.style.lineHeight = "1";
  templateDropdownContainer.appendChild(dropdownIcon);

  templateDropdown.addEventListener("focus", () => {
    templateDropdownContainer.style.borderColor = "rgba(147, 197, 253, 0.48)";
    templateDropdownContainer.style.background = "rgba(15, 23, 42, 0.98)";
  });

  templateDropdown.addEventListener("blur", () => {
    templateDropdownContainer.style.borderColor = "rgba(148, 163, 184, 0.16)";
    templateDropdownContainer.style.background = "rgba(148, 163, 184, 0.08)";
  });

  templateDropdownContainer.addEventListener("mouseenter", () => {
    templateDropdownContainer.style.borderColor = "rgba(148, 163, 184, 0.28)";
  });

  templateDropdownContainer.addEventListener("mouseleave", () => {
    templateDropdownContainer.style.borderColor = "rgba(148, 163, 184, 0.16)";
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
