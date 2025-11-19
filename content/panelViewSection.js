function createViewSection() {
  const viewSection = document.createElement("div");
  viewSection.appendChild(createSectionLabel("Code View"));
  const settings = getViewSettingsForPanel();

  const viewButtons = document.createElement("div");
  viewButtons.style.display = "flex";
  viewButtons.style.flexDirection = "column";
  viewButtons.style.gap = "6px";

  viewButtons.appendChild(
    createViewModeRow({
      label: "Compact All",
      mode: "compact",
      initialLineCount: settings.compactLineCount,
      minLineCount: 0,
      onLineCountCommit: (value) => {
        if (typeof cgptUpdateViewSettings === "function") {
          cgptUpdateViewSettings({ compactLineCount: value }, () => {
            if (typeof cgptReapplyViewMode === "function") {
              cgptReapplyViewMode("compact");
            }
          });
        }
      },
    })
  );

  viewButtons.appendChild(
    createViewModeRow({
      label: "Expand All",
      mode: "expanded",
    })
  );

  viewSection.appendChild(viewButtons);
  return viewSection;
}

function createViewModeRow({
  label,
  mode,
  initialLineCount,
  onLineCountCommit,
  minLineCount,
}) {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.gap = "8px";

  const button = createViewModeButton(label, mode);
  button.style.flex = "1";
  row.appendChild(button);

  if (typeof initialLineCount === "number" && typeof onLineCountCommit === "function") {
    const controls = createLineCountControls({
      initialValue: initialLineCount,
      onCommit: onLineCountCommit,
      min: typeof minLineCount === "number" ? minLineCount : undefined,
    });
    row.appendChild(controls);
  }

  return row;
}

function createViewModeButton(label, mode) {
  const variants = {
    compact: "accent",
    expanded: "accent",
  };
  const variant = variants[mode] || "secondary";
  const button = createPanelButton(label, variant);
  button.addEventListener("click", () => {
    applyViewModeToAll(mode);
  });
  return button;
}

function getViewSettingsForPanel() {
  if (typeof cgptGetViewSettings === "function") {
    return cgptGetViewSettings();
  }
  return { compactLineCount: 1 };
}

function applyViewModeToAll(mode) {
  if (typeof cgptApplyViewModeToAll === "function") {
    cgptApplyViewModeToAll(mode);
  }
}
