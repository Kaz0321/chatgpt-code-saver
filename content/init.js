function init() {
  checkAndNotifyReloaded();

  loadTemplatesFromStorage(() => {
    if (typeof cgptLoadViewSettings === "function") {
      cgptLoadViewSettings(() => {
        createFloatingPanel();
        if (typeof initChatLogTracker === "function") {
          initChatLogTracker();
        }
        decorateCodeBlocks(document);
        setupMutationObserver();
      });
      return;
    }
    createFloatingPanel();
    if (typeof initChatLogTracker === "function") {
      initChatLogTracker();
    }
    decorateCodeBlocks(document);
    setupMutationObserver();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
