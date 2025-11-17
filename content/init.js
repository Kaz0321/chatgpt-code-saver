function init() {
  checkAndNotifyReloaded();

  loadTemplatesFromStorage(() => {
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
