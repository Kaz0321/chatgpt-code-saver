function init() {
  checkAndNotifyReloaded();

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
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
