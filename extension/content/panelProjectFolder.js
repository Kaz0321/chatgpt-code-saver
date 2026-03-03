function createProjectFolderSection() {
  const section = createPanelSection("Project Folder");

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "e.g. dev/my-project";
  input.style.width = "100%";
  input.style.padding = "4px 6px";
  input.style.fontSize = "11px";
  input.style.borderRadius = "4px";
  if (typeof cgptApplyPanelInputStyle === "function") {
    cgptApplyPanelInputStyle(input);
  } else {
    input.style.border = "1px solid rgba(255,255,255,0.2)";
    input.style.background = "#1f2937";
    input.style.color = "#fff";
  }
  section.appendChild(input);

  cgptGetProjectFolderPath((folderPath) => {
    input.value = folderPath || "";
  });

  if (typeof cgptOnProjectFolderPathChanged === "function") {
    cgptOnProjectFolderPathChanged((newFolderPath) => {
      input.value = newFolderPath || "";
    });
  }

  const buttons = createButtonRow();
  const saveBtn = createPanelButton("Set Folder", "primary");
  saveBtn.style.flex = "1";
  saveBtn.addEventListener("click", () => {
    commitProjectFolderInput(input);
  });
  buttons.appendChild(saveBtn);
  section.appendChild(buttons);
  return section;
}

function commitProjectFolderInput(input) {
  if (!input) return;
  const rawValue = input.value || "";
  const validation = cgptValidateProjectFolderPath(rawValue);
  if (!validation.ok) {
    if (typeof showToast === "function") {
      showToast(validation.error || "Folder path is invalid.", "error");
    }
    return;
  }
  persistProjectFolderSelection(input, validation.folderPath);
}

function persistProjectFolderSelection(input, normalizedPath) {
  if (!input) return;
  cgptSetProjectFolderPath(normalizedPath || "", (result) => {
    if (!result || !result.ok) {
      const errMsg = (result && result.error) || "Failed to save the folder path.";
      if (typeof showToast === "function") {
        showToast(errMsg, "error");
      }
      return;
    }
    input.value = normalizedPath || "";
    if (typeof showToast === "function") {
      const message = normalizedPath
        ? `Project folder saved: ${normalizedPath}`
        : "Project folder cleared.";
      showToast(message, "success");
    }
  });
}
