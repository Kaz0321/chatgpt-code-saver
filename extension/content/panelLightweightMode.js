function createLightweightModeSection() {
  const section = document.createElement("div");
  section.appendChild(createSectionLabel("Lightweight Mode"));

  const buttonRow = createButtonRow();
  buttonRow.style.flexWrap = "wrap";

  const modes = [
    { label: "Normal", mode: CGPT_LIGHTWEIGHT_MODES.NORMAL },
    { label: "Auto", mode: CGPT_LIGHTWEIGHT_MODES.AUTO },
    { label: "Light", mode: CGPT_LIGHTWEIGHT_MODES.LIGHT },
  ];

  const buttons = [];

  const setActiveMode = (activeMode) => {
    buttons.forEach((button) => {
      const isActive = button.dataset.mode === activeMode;
      button.disabled = isActive;
      applyPanelButtonVariant(button, isActive ? "primary" : "secondary");
      button.style.opacity = isActive ? "1" : "0.9";
    });
  };

  const handleModeSelect = (mode) => {
    if (typeof cgptUpdateLightweightMode !== "function") {
      setActiveMode(mode);
      return;
    }
    cgptUpdateLightweightMode(mode, (appliedMode) => {
      setActiveMode(appliedMode);
    });
  };

  modes.forEach(({ label, mode }) => {
    const button = createPanelButton(label, "secondary");
    button.dataset.mode = mode;
    button.style.flex = "1";
    button.addEventListener("click", () => {
      handleModeSelect(mode);
    });
    buttonRow.appendChild(button);
    buttons.push(button);
  });

  const initialMode =
    typeof cgptGetLightweightMode === "function"
      ? cgptGetLightweightMode()
      : CGPT_DEFAULT_LIGHTWEIGHT_MODE;
  setActiveMode(initialMode);

  section.appendChild(buttonRow);
  return section;
}
