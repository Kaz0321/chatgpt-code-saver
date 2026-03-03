function createSaveOptionsSection() {
  const section = createPanelSection("Save Options");

  const checkboxRow = document.createElement("label");
  checkboxRow.style.display = "flex";
  checkboxRow.style.alignItems = "center";
  checkboxRow.style.gap = "8px";
  checkboxRow.style.fontSize = "11px";
  if (typeof cgptApplyPanelTextTone === "function") {
    cgptApplyPanelTextTone(checkboxRow, "secondary");
  } else {
    checkboxRow.style.color = "rgba(255,255,255,0.8)";
  }

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = getStripFirstLineDefault();

  const text = document.createElement("span");
  text.textContent = "Remove the first file: line when saving";
  text.style.flex = "1";

  checkbox.addEventListener("change", () => {
    if (typeof cgptUpdateSaveOptions !== "function") {
      return;
    }
    const nextValue = checkbox.checked;
    cgptUpdateSaveOptions({ stripFirstLineMetadata: nextValue }, () => {
      if (typeof showToast === "function") {
        const message = nextValue
          ? "The first file: line will be removed on save."
          : "The first line will be kept when saving.";
        showToast(message, "success");
      }
    });
  });

  checkboxRow.appendChild(checkbox);
  checkboxRow.appendChild(text);
  section.appendChild(checkboxRow);
  return section;
}

function getStripFirstLineDefault() {
  if (typeof cgptGetSaveOptions !== "function") {
    return false;
  }
  const options = cgptGetSaveOptions();
  return Boolean(options && options.stripFirstLineMetadata);
}
