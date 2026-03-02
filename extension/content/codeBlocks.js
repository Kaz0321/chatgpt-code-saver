function decorateCodeBlocks(root = document) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  cgptEnsureCodeBlockStyles();
  const pres = cgptCollectDecoratablePres(root);
  pres.forEach((pre) => {
    tryDecorateSingleCodeBlock(pre);
  });
}

function cgptGetDecoratableCodeContent(pre) {
  if (!pre || typeof pre.querySelector !== "function") return null;
  if (typeof cgptGetCodeTextContainer === "function") {
    return cgptGetCodeTextContainer(pre);
  }
  return pre.querySelector("code, .cm-content");
}

function cgptCollectDecoratablePres(root) {
  const collected = [];
  const seen = new Set();

  const addPre = (pre) => {
    if (!pre || seen.has(pre)) return;
    if (!cgptGetDecoratableCodeContent(pre)) return;
    seen.add(pre);
    collected.push(pre);
  };

  if (root.nodeType === Node.ELEMENT_NODE) {
    if (root.matches("pre")) {
      addPre(root);
    }
    const closestPre = root.closest("pre");
    if (closestPre) {
      addPre(closestPre);
    }
  }

  root.querySelectorAll("pre").forEach((pre) => {
    addPre(pre);
  });

  return collected;
}

function tryDecorateSingleCodeBlock(pre) {
  if (!pre) return;
  const code = cgptGetDecoratableCodeContent(pre);
  if (!code) return;

  const metadata = cgptParseCodeBlockMetadata(code);
  const isAlreadyDecorated = pre.dataset.cgptCodeHelperApplied === "1";

  if (!isAlreadyDecorated) {
    const wrapper = cgptWrapPreWithRelativeContainer(pre);
    pre.dataset.cgptCodeHelperApplied = "1";

    const buttonContainer = cgptCreateButtonContainer();

    const saveBtn = cgptCreateSaveButtonElement(Boolean(metadata));
    saveBtn.dataset.cgptButtonRole = "save";
    pre.cgptSaveButton = saveBtn;
    saveBtn.addEventListener("click", () => {
      cgptHandleSaveButtonClick(saveBtn, code, pre);
    });
    buttonContainer.appendChild(saveBtn);

    const saveAsBtn = cgptCreateSaveAsButtonElement();
    saveAsBtn.dataset.cgptButtonRole = "save-as";
    pre.cgptSaveAsButton = saveAsBtn;
    saveAsBtn.addEventListener("click", () => {
      cgptHandleSaveAsButtonClick(saveAsBtn, code, pre);
    });
    buttonContainer.appendChild(saveAsBtn);

    const copyBtn = cgptCreateCopyButtonElement();
    copyBtn.addEventListener("click", () => {
      cgptHandleCopyButtonClick(copyBtn, code);
    });
    buttonContainer.appendChild(copyBtn);

    const shrinkBtn = cgptCreateShrinkButtonElement();
    const expandBtn = cgptCreateExpandButtonElement();
    shrinkBtn.addEventListener("click", () => {
      cgptHandleShrinkButtonClick(pre);
    });
    expandBtn.addEventListener("click", () => {
      cgptHandleExpandButtonClick(pre);
    });
    buttonContainer.appendChild(shrinkBtn);
    buttonContainer.appendChild(expandBtn);

    wrapper.appendChild(buttonContainer);
    buttonContainer.addEventListener("mouseenter", () => {
      cgptRefreshSaveButtonState(pre, code);
    });

    pre.cgptButtonContainer = buttonContainer;
    if (typeof cgptCalculateButtonOverlayOffset === "function") {
      pre.cgptButtonOverlayOffset = cgptCalculateButtonOverlayOffset(buttonContainer);
    }

    cgptEnsureCollapsibleState(pre);
    pre.cgptViewButtons = { shrinkBtn, expandBtn };
    cgptSetPreViewMode(pre, CGPT_VIEW_MODE.COMPACT);
  }

  cgptRefreshSaveButtonState(pre, code, metadata);
}

function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    let shouldRefreshPanelLayout = false;
    for (const m of mutations) {
      if (m.type === "childList" && m.addedNodes && m.addedNodes.length > 0) {
        shouldRefreshPanelLayout = true;
        m.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.DOCUMENT_NODE) {
            decorateCodeBlocks(node);
            if (typeof captureChatLogsFromNode === "function") {
              captureChatLogsFromNode(node);
            }
          } else if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            decorateCodeBlocks(node);
            if (typeof captureChatLogsFromNode === "function") {
              captureChatLogsFromNode(node);
            }
          } else if (node.nodeType === Node.TEXT_NODE) {
            tryDecorateFromTextNode(node);
          }
        });
      } else if (m.type === "characterData") {
        tryDecorateFromTextNode(m.target);
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
}

function tryDecorateFromTextNode(node) {
  if (!node || node.nodeType !== Node.TEXT_NODE) return;
  const elementParent = node.parentElement;
  if (!elementParent) return;
  const content = elementParent.closest("code, .cm-content");
  const pre = content ? content.closest("pre") : elementParent.closest("pre");
  if (!pre) return;
  tryDecorateSingleCodeBlock(pre);
}
