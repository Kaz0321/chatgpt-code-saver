function createExtensionToggleSection() {
  const section = document.createElement("div");
  section.appendChild(createSectionLabel("Extension"));

  const status = document.createElement("div");
  status.style.fontSize = "11px";
  status.style.color = "rgba(255,255,255,0.85)";
  status.style.marginBottom = "6px";

  const buttonRow = createButtonRow();

  const enableButton = createPanelButton("有効化", "accent");
  enableButton.style.flex = "1";
  const disableButton = createPanelButton("無効化", "muted");
  disableButton.style.flex = "1";

  const updateStateLabel = () => {
    const enabled = typeof cgptIsExtensionEnabled === "function" ? cgptIsExtensionEnabled() : true;
    status.textContent = enabled ? "現在: 有効" : "現在: 無効";
    enableButton.disabled = enabled;
    disableButton.disabled = !enabled;
  };

  enableButton.addEventListener("click", () => {
    cgptUpdateExtensionEnabled(true, () => {
      updateStateLabel();
      window.location.reload();
    });
  });

  disableButton.addEventListener("click", () => {
    cgptUpdateExtensionEnabled(false, () => {
      updateStateLabel();
      window.location.reload();
    });
  });

  buttonRow.appendChild(enableButton);
  buttonRow.appendChild(disableButton);

  section.appendChild(status);
  section.appendChild(buttonRow);

  updateStateLabel();
  return section;
}
