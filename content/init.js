function init() {
  checkAndNotifyReloaded();

  const startHelper = () => {
    loadTemplatesFromStorage(() => {
      const finalizeSetup = () => {
        createFloatingPanel();
        if (typeof initChatLogTracker === "function") {
          initChatLogTracker();
        }
        if (typeof cgptStartLightweightModeWatcher === "function") {
          cgptStartLightweightModeWatcher();
        }
        decorateCodeBlocks(document);
        setupMutationObserver();
      };

      const ensureSaveOptionsLoaded = (next) => {
        if (typeof cgptLoadSaveOptions === "function") {
          cgptLoadSaveOptions(next);
          return;
        }
        next();
      };

      const ensurePanelVisibilityLoaded = (next) => {
        if (typeof cgptLoadPanelVisibility === "function") {
          cgptLoadPanelVisibility(next);
          return;
        }
        next();
      };

      const ensureLightweightModeLoaded = (next) => {
        if (typeof cgptLoadLightweightMode === "function") {
          cgptLoadLightweightMode(next);
          return;
        }
        next();
      };

      const continueAfterViewSettings = () => {
        ensurePanelVisibilityLoaded(() => {
          ensureLightweightModeLoaded(() => {
            ensureSaveOptionsLoaded(finalizeSetup);
          });
        });
      };

      if (typeof cgptLoadViewSettings === "function") {
        cgptLoadViewSettings(continueAfterViewSettings);
        return;
      }

      continueAfterViewSettings();
    });
  };

  const startWithExtensionState = () => {
    if (typeof cgptIsExtensionEnabled === "function" && !cgptIsExtensionEnabled()) {
      if (typeof cgptRenderExtensionDisabledEntryPoint === "function") {
        cgptRenderExtensionDisabledEntryPoint();
      }
      return;
    }
    startHelper();
  };

  if (typeof cgptLoadExtensionEnabled === "function") {
    cgptLoadExtensionEnabled(startWithExtensionState);
    return;
  }

  startWithExtensionState();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
