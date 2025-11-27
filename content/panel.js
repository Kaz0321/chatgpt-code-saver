function createFloatingPanel() {
  if (document.getElementById("cgpt-code-helper-panel")) return;

  const panel = createPanelContainer();
  const toggleButton =
    typeof cgptCreatePanelToggleButton === "function"
      ? cgptCreatePanelToggleButton()
      : null;

  const visibilityState =
    typeof cgptGetPanelVisibility === "function"
      ? cgptGetPanelVisibility()
      : { hidden: false };

  const applyHiddenState =
    typeof cgptApplyPanelVisibility === "function"
      ? cgptApplyPanelVisibility(panel, {
          hidden: visibilityState.hidden,
          toggleButton,
        })
      : null;

  const requestVisibility = (hidden) => {
    if (typeof cgptUpdatePanelVisibility === "function") {
      cgptUpdatePanelVisibility({ hidden }, (state) => {
        applyHiddenState?.(state.hidden);
      });
      return;
    }
    applyHiddenState?.(hidden);
  };

  const header =
    typeof cgptCreatePanelHeader === "function"
      ? cgptCreatePanelHeader({ onHide: () => requestVisibility(true) })
      : createPanelTitle();
  panel.appendChild(header);
  panel.appendChild(createProjectFolderSection());
  panel.appendChild(createSaveOptionsSection());
  panel.appendChild(createTemplateSection());
  panel.appendChild(createLightweightModeSection());
  panel.appendChild(createViewSection());
  panel.appendChild(createLogSection());

  document.body.appendChild(panel);

  if (toggleButton) {
    toggleButton.addEventListener("click", () => {
      requestVisibility(false);
    });
    document.body.appendChild(toggleButton);
  }
}
