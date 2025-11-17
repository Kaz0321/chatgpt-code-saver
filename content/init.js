function init() {
  checkAndNotifyReloaded();

  loadTemplatesFromStorage(() => {
    createFloatingPanel();
    decorateCodeBlocks(document);
    setupMutationObserver();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
