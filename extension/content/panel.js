function createFloatingPanel() {
  if (document.getElementById("cgpt-code-helper-panel")) return;

  const panel = createPanelContainer();
  const toggleButton =
    typeof cgptCreatePanelToggleButton === "function"
      ? cgptCreatePanelToggleButton()
      : null;
  const templateToggleButton =
    typeof cgptCreateTemplateToggleButton === "function"
      ? cgptCreateTemplateToggleButton()
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
  if (typeof createExtensionToggleSection === "function") {
    panel.appendChild(createExtensionToggleSection());
  }
  panel.appendChild(createProjectFolderSection());
  panel.appendChild(createSaveOptionsSection());
  panel.appendChild(createLightweightModeSection());
  panel.appendChild(createViewSection());
  panel.appendChild(createLogSection());

  document.body.appendChild(panel);

  if (toggleButton) {
    toggleButton.addEventListener("click", () => {
      const nextHidden =
        typeof cgptGetPanelVisibility === "function"
          ? !cgptGetPanelVisibility().hidden
          : panel.style.display !== "none";
      requestVisibility(nextHidden);
    });
    document.body.appendChild(toggleButton);
  }

  if (templateToggleButton) {
    templateToggleButton.addEventListener("click", () => {
      if (typeof cgptToggleTemplatePanel === "function") {
        cgptToggleTemplatePanel();
      } else if (typeof openTemplatePanel === "function") {
        openTemplatePanel();
      }
    });
    document.body.appendChild(templateToggleButton);
  }

  if (typeof cgptSyncPanelLayoutState === "function") {
    cgptSyncPanelLayoutState({
      panel,
      toggleButton,
      hidden: visibilityState.hidden,
    });
  }
}
