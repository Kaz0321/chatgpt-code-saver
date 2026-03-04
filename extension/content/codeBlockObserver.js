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
        "#cgpt-code-helper-panel",
        "#cgpt-helper-chatlog-modal",
        "[data-cgpt-code-wrapper='1']",
        "[data-cgpt-code-collapse-cue='1']",
        "[data-cgpt-code-collapse-top-cue='1']",
        "[data-cgpt-code-toggle='1']",
        "[data-cgpt-code-file-path='1']",
        "[data-cgpt-code-actions='1']",
        ".cgpt-helper-fold",
        ".cgpt-helper-heading-section",
      ].join(",")
    )
  );
}

function cgptCanContainCodeBlocks(node) {
  if (!node) return false;
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? node
      : node.nodeType === Node.DOCUMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE
        ? node
        : node.parentElement || null;
  if (!element || cgptIsHelperOwnedNode(element)) {
    return false;
  }
  if (typeof element.matches === "function" && element.matches("pre, code, .cm-content")) {
    return true;
  }
  return Boolean(
    typeof element.querySelector === "function" && element.querySelector("pre, code, .cm-content")
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
        addedNodes.forEach((node) => {
          if (!cgptCanContainCodeBlocks(node)) {
            return;
          }
          shouldRefreshPanelLayout = true;
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

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptIsHelperOwnedNode,
    cgptCanContainCodeBlocks,
  };
}
