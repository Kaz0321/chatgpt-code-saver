function createExtensionToggleSection() {
  const section = document.createElement("div");
  section.appendChild(createSectionLabel("Extension"));

  const buttonRow = createButtonRow();

  const enableButton = createPanelButton("Enable", "accent");
  enableButton.style.flex = "1";
  const disableButton = createPanelButton("Disable", "muted");
  disableButton.style.flex = "1";

  const updateStateControls = () => {
    const enabled = typeof cgptIsExtensionEnabled === "function" ? cgptIsExtensionEnabled() : true;
    enableButton.disabled = enabled;
    disableButton.disabled = !enabled;
  };

  enableButton.addEventListener("click", () => {
    cgptUpdateExtensionEnabled(true, () => {
      updateStateControls();
      window.location.reload();
    });
  });

  disableButton.addEventListener("click", () => {
    cgptUpdateExtensionEnabled(false, () => {
      updateStateControls();
      window.location.reload();
    });
  });

  buttonRow.appendChild(enableButton);
  buttonRow.appendChild(disableButton);

  section.appendChild(buttonRow);

  updateStateControls();
  return section;
}
