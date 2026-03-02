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
  viewSection.appendChild(createHeadingViewSection());
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
  headingSection.appendChild(createSectionLabel("Headings"));

  const levelList = document.createElement("div");
  levelList.style.display = "flex";
  levelList.style.flexDirection = "column";
  levelList.style.gap = "6px";

  [1, 2, 3, 4, 5, 6].forEach((level) => {
    levelList.appendChild(createHeadingLevelRow(level));
  });

  headingSection.appendChild(levelList);
  return headingSection;
}

function createHeadingLevelRow(level) {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.gap = "6px";

  const label = document.createElement("span");
  label.textContent = `Level ${level}`;
  label.style.flex = "1";
  label.style.fontWeight = "600";
  if (typeof cgptApplyPanelTextTone === "function") {
    cgptApplyPanelTextTone(label, "secondary");
  } else {
    label.style.color = getHeadingLevelColor(level);
  }
  row.appendChild(label);

  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.gap = "4px";

  const collapseButton = createPanelButton("Compact All", "secondary");
  applyHeadingButtonTheme(collapseButton, level);
  collapseButton.addEventListener("click", () => requestHeadingFoldChange(level, false));
  controls.appendChild(collapseButton);

  const expandButton = createPanelButton("Expand All", "secondary");
  applyHeadingButtonTheme(expandButton, level);
  expandButton.addEventListener("click", () => requestHeadingFoldChange(level, true));
  controls.appendChild(expandButton);

  row.appendChild(controls);
  return row;
}

function applyHeadingButtonTheme(button, level) {
  if (!button) return;
  if (typeof cgptSetSharedButtonCustomPalette === "function") {
    cgptSetSharedButtonCustomPalette(button, {
      background: "rgba(241, 245, 249, 0.92)",
      hoverBackground: "rgba(226, 232, 240, 0.96)",
      activeBackground: "rgba(226, 232, 240, 1)",
      border: "rgba(148, 163, 184, 0.52)",
      hoverBorder: "rgba(148, 163, 184, 0.64)",
      activeBorder: "rgba(148, 163, 184, 0.72)",
      color: "#334155",
      focusRing: "rgba(147, 197, 253, 0.28)",
    });
    return;
  }
  button.style.background = "rgba(241, 245, 249, 0.92)";
  button.style.borderColor = "rgba(148, 163, 184, 0.52)";
  button.style.color = "#334155";
}

function getHeadingLevelColor(level) {
  if (typeof cgptGetFoldLevelColor === "function") {
    return cgptGetFoldLevelColor(level);
  }
  const fallback = [
    "#60a5fa",
    "#a78bfa",
    "#f472b6",
    "#34d399",
    "#f59e0b",
    "#38bdf8",
    "#c084fc",
  ];
  const parsed = Number.parseInt(level, 10);
  const index = Math.min(Math.max(Number.isFinite(parsed) ? parsed : 0, 0), fallback.length - 1);
  return fallback[index];
}

function requestHeadingFoldChange(level, shouldExpand) {
  if (typeof cgptToggleHeadingFoldsAtLevel === "function") {
    cgptToggleHeadingFoldsAtLevel(level, shouldExpand);
  }
}
