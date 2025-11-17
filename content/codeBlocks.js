function decorateCodeBlocks(root = document) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  cgptEnsureCodeBlockStyles();
  const pres = root.querySelectorAll("pre code");
  pres.forEach((code) => {
    tryDecorateSingleCodeBlock(code);
  });
}

function tryDecorateSingleCodeBlock(code) {
  if (!code) return;
  const pre = code.closest("pre");
  if (!pre) return;

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
      cgptHandleSaveButtonClick(saveBtn, code);
    });
    buttonContainer.appendChild(saveBtn);

    const copyBtn = cgptCreateCopyButtonElement();
    copyBtn.addEventListener("click", () => {
      cgptHandleCopyButtonClick(copyBtn, code);
    });
    buttonContainer.appendChild(copyBtn);

    const shrinkBtn = cgptCreateShrinkButtonElement();
    const collapseBtn = cgptCreateCollapseButtonElement();
    const expandBtn = cgptCreateExpandButtonElement();
    shrinkBtn.addEventListener("click", () => {
      cgptHandleShrinkButtonClick(pre);
    });
    collapseBtn.addEventListener("click", () => {
      cgptHandleCollapseButtonClick(pre);
    });
    expandBtn.addEventListener("click", () => {
      cgptHandleExpandButtonClick(pre);
    });
    buttonContainer.appendChild(shrinkBtn);
    buttonContainer.appendChild(collapseBtn);
    buttonContainer.appendChild(expandBtn);

    wrapper.appendChild(buttonContainer);

    cgptEnsureCollapsibleState(pre);
    pre.cgptViewButtons = { shrinkBtn, collapseBtn, expandBtn };
    cgptSetPreViewMode(pre, CGPT_VIEW_MODE.COMPACT);
  }

  cgptRefreshSaveButtonState(pre, code, metadata);
}

function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "childList" && m.addedNodes && m.addedNodes.length > 0) {
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
  const code = elementParent.closest("code");
  if (!code) return;
  tryDecorateSingleCodeBlock(code);
}
