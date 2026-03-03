let cgptCodeBlockObserver = null;

function cgptIsHelperOwnedNode(node) {
  if (!node) return false;
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? node
      : node.parentElement || null;
  if (!element || typeof element.closest !== "function") {
    return false;
  }
  return Boolean(
    element.closest(
      [
        "[data-cgpt-code-file-path='1']",
        "[data-cgpt-code-actions='1']",
      ].join(",")
    )
  );
}

function setupCodeBlockMutationObserver() {
  if (cgptCodeBlockObserver) return cgptCodeBlockObserver;
  const observer = new MutationObserver((mutations) => {
    let shouldRefreshPanelLayout = false;
    for (const mutation of mutations) {
      if (cgptIsHelperOwnedNode(mutation.target)) {
        continue;
      }
      if (mutation.type === "childList" && mutation.addedNodes && mutation.addedNodes.length > 0) {
        const addedNodes = Array.from(mutation.addedNodes).filter((node) => !cgptIsHelperOwnedNode(node));
        if (addedNodes.length === 0) {
          continue;
        }
        shouldRefreshPanelLayout = true;
        addedNodes.forEach((node) => {
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
