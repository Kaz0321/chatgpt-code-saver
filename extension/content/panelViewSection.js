function createViewSection() {
  const viewSection = createPanelSection("Code View");
  const settings = getViewSettingsForPanel();

  viewSection.appendChild(createViewModeButtonsRow());
  viewSection.appendChild(
    createPreviewLineSection({
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
  viewSection.appendChild(createHeadingViewSection());
  return viewSection;
}

function createViewModeButtonsRow() {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "4px";
  row.style.minWidth = "0";

  const compactButton = createViewModeButton("Compact", "compact");
  compactButton.style.flex = "1";
  row.appendChild(compactButton);

  const expandButton = createViewModeButton("Expand", "expanded");
  expandButton.style.flex = "1";
  row.appendChild(expandButton);

  return row;
}

function createPreviewLineSection({
  initialLineCount,
  onLineCountCommit,
  minLineCount,
}) {
  const section = document.createElement("div");
  section.style.display = "flex";
  section.style.flexDirection = "column";
  section.style.gap = "4px";

  const controlsLabel = document.createElement("div");
  controlsLabel.textContent = "Preview lines";
  controlsLabel.style.fontSize = "11px";
  controlsLabel.style.fontWeight = "600";
  if (typeof cgptApplyPanelTextTone === "function") {
    cgptApplyPanelTextTone(controlsLabel, "muted");
  }
  section.appendChild(controlsLabel);

  if (typeof initialLineCount === "number" && typeof onLineCountCommit === "function") {
    const controls = createLineCountControls({
      initialValue: initialLineCount,
      onCommit: onLineCountCommit,
      min: typeof minLineCount === "number" ? minLineCount : undefined,
    });
    section.appendChild(controls);
  }

  return section;
}

function createViewModeButton(label, mode) {
  const variants = {
    compact: "secondary",
    expanded: "secondary",
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

function createHeadingViewSection() {
  const headingSection = document.createElement("div");
  headingSection.style.display = "flex";
  headingSection.style.flexDirection = "column";
  headingSection.style.gap = "4px";

  const headingLabel = createSectionLabel("Headings");
  headingSection.appendChild(headingLabel);

  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.flexDirection = "row";
  controls.style.gap = "4px";

  const collapseButton = createPanelButton("Compact", "secondary");
  collapseButton.style.flex = "1";
  collapseButton.addEventListener("click", () => requestAllHeadingFoldChanges(false));
  controls.appendChild(collapseButton);

  const expandButton = createPanelButton("Expand", "secondary");
  expandButton.style.flex = "1";
  expandButton.addEventListener("click", () => requestAllHeadingFoldChanges(true));
  controls.appendChild(expandButton);

  headingSection.appendChild(controls);
  return headingSection;
}

function requestHeadingFoldChange(level, shouldExpand) {
  if (typeof cgptToggleHeadingFoldsAtLevel === "function") {
    cgptToggleHeadingFoldsAtLevel(level, shouldExpand);
  }
}

function requestAllHeadingFoldChanges(shouldExpand) {
  [1, 2, 3, 4, 5, 6].forEach((level) => {
    requestHeadingFoldChange(level, shouldExpand);
  });
}
