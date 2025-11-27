function cgptEnsureLoaded(loader, next) {
  if (typeof loader === "function") {
    loader(next);
    return;
  }
  next();
}

function cgptRenderExtensionIfEnabled(onEnabled) {
  if (typeof cgptIsExtensionEnabled === "function" && !cgptIsExtensionEnabled()) {
    if (typeof cgptRenderExtensionDisabledEntryPoint === "function") {
      cgptRenderExtensionDisabledEntryPoint();
    }
    return;
  }
  onEnabled();
}

function cgptInitializeUi() {
  createFloatingPanel();
  if (typeof initChatLogTracker === "function") {
    initChatLogTracker();
  }
  if (typeof cgptStartLightweightModeWatcher === "function") {
    cgptStartLightweightModeWatcher();
  }
  decorateCodeBlocks(document);
  setupMutationObserver();
}

function cgptLoadPanelStateAndStart() {
  const finalizeSetup = () => {
    cgptInitializeUi();
  };

  const continueAfterViewSettings = () => {
    cgptEnsureLoaded(cgptLoadPanelVisibility, () => {
      cgptEnsureLoaded(cgptLoadLightweightMode, () => {
        cgptEnsureLoaded(cgptLoadSaveOptions, finalizeSetup);
      });
    });
  };

  cgptEnsureLoaded(cgptLoadViewSettings, continueAfterViewSettings);
}

function cgptStartHelper() {
  loadTemplatesFromStorage(() => {
    cgptLoadPanelStateAndStart();
  });
}

function init() {
  checkAndNotifyReloaded();

  const startWithExtensionState = () => {
    cgptRenderExtensionIfEnabled(cgptStartHelper);
  };

  cgptEnsureLoaded(cgptLoadExtensionEnabled, startWithExtensionState);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
