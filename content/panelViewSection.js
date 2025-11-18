function createViewSection() {
  const viewSection = document.createElement("div");
  viewSection.appendChild(createSectionLabel("コード表示"));
  const settings = getViewSettingsForPanel();

  const compactRow = createLineCountRow("縮小行数", settings.compactLineCount, (value) => {
    if (typeof cgptUpdateViewSettings === "function") {
      cgptUpdateViewSettings({ compactLineCount: value }, () => {
        if (typeof cgptReapplyViewMode === "function") {
          cgptReapplyViewMode("compact");
        }
      });
    }
  });
  viewSection.appendChild(compactRow);

  const collapsedRow = createLineCountRow(
    "折りたたみ行数",
    settings.collapsedLineCount,
    (value) => {
      if (typeof cgptUpdateViewSettings === "function") {
        cgptUpdateViewSettings({ collapsedLineCount: value }, () => {
          if (typeof cgptReapplyViewMode === "function") {
            cgptReapplyViewMode("collapsed");
          }
        });
      }
    }
  );
  viewSection.appendChild(collapsedRow);

  const viewButtons = createButtonRow();
  viewButtons.appendChild(createViewModeButton("Compact All", "compact"));
  viewButtons.appendChild(createViewModeButton("Collapse All", "collapsed"));
  viewButtons.appendChild(createViewModeButton("Expand All", "expanded"));
  viewSection.appendChild(viewButtons);
  return viewSection;
}

function createViewModeButton(label, mode) {
  const variants = {
    compact: "accent",
    collapsed: "accent",
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
  return { compactLineCount: 1, collapsedLineCount: 12 };
}

function applyViewModeToAll(mode) {
  if (typeof cgptApplyViewModeToAll === "function") {
    cgptApplyViewModeToAll(mode);
  }
}
