let cgptCodeBlockObserver = null;

function setupCodeBlockMutationObserver() {
  if (cgptCodeBlockObserver) return cgptCodeBlockObserver;
  const observer = new MutationObserver((mutations) => {
    let shouldRefreshPanelLayout = false;
    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes && mutation.addedNodes.length > 0) {
        shouldRefreshPanelLayout = true;
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.DOCUMENT_NODE) {
            decorateCodeBlocks(node);
          } else if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            decorateCodeBlocks(node);
          } else if (node.nodeType === Node.TEXT_NODE) {
            tryDecorateFromTextNode(node);
          }
        });
      } else if (mutation.type === "characterData") {
        tryDecorateFromTextNode(mutation.target);
      }
    }
    if (shouldRefreshPanelLayout && typeof cgptSchedulePanelLayoutRefresh === "function") {
      cgptSchedulePanelLayoutRefresh();
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  cgptCodeBlockObserver = observer;
  return observer;
}

function setupMutationObserver() {
  return setupCodeBlockMutationObserver();
}
