function init() {
  checkAndNotifyReloaded();

  loadTemplatesFromStorage(() => {
    const finalizeSetup = () => {
      createFloatingPanel();
      if (typeof initChatLogTracker === "function") {
        initChatLogTracker();
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

    const continueAfterViewSettings = () => {
      ensureSaveOptionsLoaded(finalizeSetup);
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
