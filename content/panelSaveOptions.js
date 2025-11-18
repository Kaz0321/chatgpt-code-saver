function createSaveOptionsSection() {
  const section = document.createElement("div");
  section.appendChild(createSectionLabel("保存オプション"));

  const checkboxRow = document.createElement("label");
  checkboxRow.style.display = "flex";
  checkboxRow.style.alignItems = "center";
  checkboxRow.style.gap = "8px";
  checkboxRow.style.fontSize = "11px";
  checkboxRow.style.color = "rgba(255,255,255,0.8)";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = getStripFirstLineDefault();

  const text = document.createElement("span");
  text.textContent = "保存時に1行目の file: 行を削除";
  text.style.flex = "1";

  checkbox.addEventListener("change", () => {
    if (typeof cgptUpdateSaveOptions !== "function") {
      return;
    }
    const nextValue = checkbox.checked;
    cgptUpdateSaveOptions({ stripFirstLineMetadata: nextValue }, () => {
      if (typeof showToast === "function") {
        const message = nextValue
          ? "保存時に1行目の file: 行を取り除きます"
          : "保存時の1行目を保持します";
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
