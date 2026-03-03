function createDisplaySection() {
  const section = createPanelSection("Display");
  section.appendChild(createDisplaySubLabel("Lightweight Mode"));
  section.appendChild(createLightweightModeControls());
  section.appendChild(createDisplaySubLabel("Preview lines"));
  section.appendChild(createDisplayPreviewLineControls());
  return section;
}

function createLightweightModeSection() {
  return createDisplaySection();
}

function createDisplaySubLabel(text) {
  const label = document.createElement("div");
  label.textContent = text;
  label.style.fontSize = "11px";
  label.style.fontWeight = "600";
  if (typeof cgptApplyPanelTextTone === "function") {
    cgptApplyPanelTextTone(label, "muted");
  } else {
    label.style.color = "rgba(255,255,255,0.68)";
  }
  return label;
}

function createLightweightModeControls() {
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
      if (typeof cgptSetSharedButtonDisabled === "function") {
        cgptSetSharedButtonDisabled(button, isActive);
      } else {
        button.disabled = isActive;
      }
      applyPanelButtonVariant(button, isActive ? "primary" : "secondary");
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

  return buttonRow;
}

function createDisplayPreviewLineControls() {
  const settings =
    typeof cgptGetViewSettings === "function"
      ? cgptGetViewSettings()
      : { compactLineCount: 1 };
  return createLineCountControls({
    initialValue: settings.compactLineCount,
    min: 0,
    onCommit: (value) => {
      if (typeof cgptUpdateViewSettings === "function") {
        cgptUpdateViewSettings({ compactLineCount: value }, () => {
          if (typeof cgptReapplyViewMode === "function") {
            cgptReapplyViewMode("compact");
          }
        });
      }
    },
  });
}
