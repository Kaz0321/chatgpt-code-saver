function cgptInitCodeSaverFeature(root = document) {
  if (typeof decorateCodeBlocks === "function") {
    decorateCodeBlocks(root);
  }
  if (typeof setupCodeBlockMutationObserver === "function") {
    setupCodeBlockMutationObserver();
    return;
  }
  if (typeof setupMutationObserver === "function") {
    setupMutationObserver();
  }
}
