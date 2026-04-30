function createViewSection() {
  const viewSection = createPanelSection("View Controls");
  viewSection.appendChild(createDisplayActionsSubLabel("Code Blocks"));
  viewSection.appendChild(createViewModeButtonsRow());
  viewSection.appendChild(createCodeBlockReapplyButton());
  viewSection.appendChild(createHeadingViewSection());
  return viewSection;
}

function createViewModeButtonsRow() {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "4px";
  row.style.minWidth = "0";

  const compactButton = createViewModeButton("Compact All", "compact");
  compactButton.style.flex = "1";
  compactButton.title = "Collapse all decorated code blocks to compact view";
  row.appendChild(compactButton);

  const expandButton = createViewModeButton("Expand All", "expanded");
  expandButton.style.flex = "1";
  expandButton.title = "Expand all decorated code blocks";
  row.appendChild(expandButton);

  return row;
}

function createDisplayActionsSubLabel(text) {
  const helpText = document.createElement("div");
  helpText.textContent = text;
  helpText.style.fontSize = "11px";
  helpText.style.fontWeight = "600";
  if (typeof cgptApplyPanelTextTone === "function") {
    cgptApplyPanelTextTone(helpText, "muted");
  } else {
    helpText.style.color = "rgba(255,255,255,0.68)";
  }
  return helpText;
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

function applyViewModeToAll(mode) {
  if (typeof cgptApplyViewModeToAll === "function") {
    cgptApplyViewModeToAll(mode);
  }
}

function createCodeBlockReapplyButton() {
  const button = createPanelButton("Reapply", "secondary");
  button.title = "Rebuild code block decorations after temporary layout shifts";
  button.addEventListener("click", () => {
    requestCodeSaverReapply();
  });
  return button;
}

function requestCodeSaverReapply() {
  if (typeof cgptReapplyCodeSaverDecorations === "function") {
    cgptReapplyCodeSaverDecorations(document);
  } else if (typeof decorateCodeBlocks === "function") {
    decorateCodeBlocks(document);
  }
  if (typeof showToast === "function") {
    showToast("Reapplied code block decorations.", "success");
  }
}

function createHeadingViewSection() {
  const headingSection = document.createElement("div");
  headingSection.style.display = "flex";
  headingSection.style.flexDirection = "column";
  headingSection.style.gap = "4px";

  const headingLabel = createDisplayActionsSubLabel("Headings");
  headingSection.appendChild(headingLabel);

  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.flexDirection = "row";
  controls.style.gap = "4px";

  const collapseButton = createPanelButton("Collapse All", "secondary");
  collapseButton.style.flex = "1";
  collapseButton.title = "Collapse all visible heading folds";
  collapseButton.addEventListener("click", () => requestAllHeadingFoldChanges(false));
  controls.appendChild(collapseButton);

  const expandButton = createPanelButton("Expand All", "secondary");
  expandButton.style.flex = "1";
  expandButton.title = "Expand all visible heading folds";
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

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    requestCodeSaverReapply,
  };
}
