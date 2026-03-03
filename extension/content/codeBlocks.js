function decorateCodeBlocks(root = document) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  cgptEnsureCodeBlockStyles();
  const pres = cgptCollectDecoratablePres(root);
  pres.forEach((pre) => {
    tryDecorateSingleCodeBlock(pre);
  });
}

function cgptGetCompactContentHost(pre) {
  const code = cgptGetDecoratableCodeContent(pre);
  if (!code) return pre;
  if (code.classList && code.classList.contains("cm-content")) {
    return code.closest(".cm-scroller") || code.parentElement || code;
  }
  return code;
}

function cgptCreateCompactPreviewElement() {
  const preview = document.createElement("div");
  preview.dataset.cgptCodePreview = "1";
  preview.setAttribute("aria-hidden", "true");
  preview.style.boxSizing = "border-box";
  preview.style.overflow = "hidden";
  preview.style.margin = "0";
  preview.style.minWidth = "0";

  const code = document.createElement("code");
  code.dataset.cgptCodePreviewContent = "1";
  code.style.display = "block";
  preview.appendChild(code);
  return preview;
}

function cgptApplyCompactPreviewStyles(preview, originalPre, originalHost, originalCode) {
  if (!preview || typeof window === "undefined" || typeof window.getComputedStyle !== "function") {
    return;
  }
  const preStyle = window.getComputedStyle(originalPre);
  const hostStyle = originalHost ? window.getComputedStyle(originalHost) : null;
  const codeStyle = originalCode ? window.getComputedStyle(originalCode) : null;
  preview.style.padding = hostStyle ? hostStyle.padding : "0";
  preview.style.borderRadius = hostStyle ? hostStyle.borderRadius : "0";
  preview.style.background = "transparent";
  preview.style.border = "0";
  preview.style.boxShadow = "none";
  preview.style.color = preStyle.color;

  const code = preview.querySelector("[data-cgpt-code-preview-content='1']");
  if (!code || !codeStyle) return;
  code.style.fontFamily = codeStyle.fontFamily;
  code.style.fontSize = codeStyle.fontSize;
  code.style.fontWeight = codeStyle.fontWeight;
  code.style.lineHeight = codeStyle.lineHeight;
  code.style.letterSpacing = codeStyle.letterSpacing;
  code.style.tabSize = codeStyle.tabSize;
  code.style.whiteSpace = "pre-wrap";
  code.style.wordBreak = "break-word";
  code.style.color = codeStyle.color || preStyle.color;
}

function cgptFindNativeHeaderLabelContainer(pre) {
  if (!pre || typeof pre.querySelectorAll !== "function") return null;
  const buttons = Array.from(pre.querySelectorAll("button[aria-label]"));
  const copyButton = buttons.find((button) => {
    const label = button.getAttribute("aria-label") || "";
    return /copy|コピー/i.test(label);
  });
  if (!copyButton) return null;

  const hasCodeContentDescendant = (element) => {
    return Boolean(
      element &&
      typeof element.querySelector === "function" &&
      element.querySelector("pre, code, .cm-content, .cm-scroller, [data-cgpt-code-preview='1']")
    );
  };

  const getCandidateText = (element) => {
    if (!element) return "";
    return (element.textContent || "").replace(/\s+/g, " ").trim();
  };

  const isCompactLabelTarget = (element) => {
    if (!element || hasCodeContentDescendant(element)) return null;
    if (
      element.dataset &&
      (
        element.dataset.cgptCodeFilePath === "1" ||
        element.dataset.cgptCodePathHost === "1" ||
        element.dataset.cgptCodeToggle === "1"
      )
    ) {
      return false;
    }
    const text = getCandidateText(element);
    return Boolean(text) && !/\n/.test(text) && text.length <= 120;
  };

  const findCompactLabelTarget = (element) => {
    if (!element || hasCodeContentDescendant(element)) return null;
    if (isCompactLabelTarget(element)) {
      return element;
    }
    const childElements = Array.from(element.children || []);
    for (const child of childElements) {
      const nestedMatch = findCompactLabelTarget(child);
      if (nestedMatch) {
        return nestedMatch;
      }
    }
    return null;
  };

  let current = copyButton;
  while (current && current !== pre) {
    const parent = current.parentElement;
    if (!parent) break;
    const siblings = Array.from(parent.children || []).filter((child) => !child.contains(copyButton));
    for (const sibling of siblings) {
      const labelCandidate = findCompactLabelTarget(sibling);
      if (labelCandidate) {
        return labelCandidate;
      }
    }
    current = parent;
  }
  return null;
}

function cgptSyncCompactHeaderPath(pre, metadata, mode) {
  if (!pre) return;
  const existingNodes = Array.from(pre.querySelectorAll("[data-cgpt-code-file-path='1']"));
  if (mode !== "compact" || !metadata || !metadata.filePath) {
    existingNodes.forEach((node) => node.remove());
    pre.querySelectorAll("[data-cgpt-code-path-host='1']").forEach((node) => {
      delete node.dataset.cgptCodePathHost;
    });
    return;
  }

  const container = cgptFindNativeHeaderLabelContainer(pre);
  if (!container) {
    existingNodes.forEach((node) => node.remove());
    return;
  }

  existingNodes.forEach((node) => {
    if (!container.contains(node)) {
      node.remove();
    }
  });

  pre.querySelectorAll("[data-cgpt-code-path-host='1']").forEach((node) => {
    if (node !== container) {
      delete node.dataset.cgptCodePathHost;
    }
  });

  container.dataset.cgptCodePathHost = "1";
  const existing = container.querySelector(":scope > [data-cgpt-code-file-path='1']");

  const pathEl = existing || document.createElement("span");
  pathEl.dataset.cgptCodeFilePath = "1";
  const nextPathText = ` ${metadata.filePath}`;
  if (pathEl.textContent !== nextPathText) {
    pathEl.textContent = nextPathText;
  }
  if (pathEl.title !== metadata.filePath) {
    pathEl.title = metadata.filePath;
  }
  pathEl.style.marginInlineStart = "8px";
  pathEl.style.fontSize = "11px";
  pathEl.style.fontWeight = "500";
  pathEl.style.lineHeight = "1.2";
  pathEl.style.opacity = "0.78";
  pathEl.style.overflow = "hidden";
  pathEl.style.textOverflow = "ellipsis";
  pathEl.style.whiteSpace = "nowrap";
  pathEl.style.maxWidth = "100%";
  if (!existing) {
    container.appendChild(pathEl);
  }
}

function cgptBuildCompactPreviewText(code, lineCount) {
  const source =
    typeof cgptGetDisplayCodeText === "function"
      ? cgptGetDisplayCodeText(code)
      : typeof cgptGetNormalizedCodeText === "function"
        ? cgptGetNormalizedCodeText(code)
        : "";
  const normalized = source.replace(/\r\n/g, "\n").replace(/\n+$/, "");
  if (!normalized) {
    return "";
  }
  const lines = normalized.split("\n");
  const safeLineCount = Number.isFinite(lineCount) ? Math.max(0, lineCount) : 0;
  if (safeLineCount <= 0) {
    return lines.length ? "..." : "";
  }
  const previewLines = lines.slice(0, safeLineCount);
  if (lines.length > safeLineCount) {
    previewLines.push("...");
  }
  return previewLines.join("\n");
}

function cgptSyncCompactPreview(pre, lineCount) {
  if (!pre) return null;
  const host = cgptGetCompactContentHost(pre);
  if (!host || !host.parentElement) return null;
  const code =
    typeof cgptGetDecoratableCodeContent === "function" ? cgptGetDecoratableCodeContent(pre) : null;
  if (!code) return null;

  let preview = host.parentElement.querySelector(":scope > [data-cgpt-code-preview='1']");
  if (!preview) {
    preview = cgptCreateCompactPreviewElement();
    host.insertAdjacentElement("afterend", preview);
  }
  cgptApplyCompactPreviewStyles(preview, pre, host, code);
  const previewContent = preview.querySelector("[data-cgpt-code-preview-content='1']");
  if (previewContent) {
    const nextPreviewText = cgptBuildCompactPreviewText(code, lineCount);
    if (previewContent.textContent !== nextPreviewText) {
      previewContent.textContent = nextPreviewText;
    }
  }
  return preview;
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
    pre.cgptMetadata = metadata || null;
    cgptSyncCompactPreview(pre, 1);
    cgptSetPreViewMode(pre, CGPT_VIEW_MODE.COMPACT);
  }

  pre.cgptMetadata = metadata || null;
  if (typeof cgptGetViewSettings === "function") {
    const settings = cgptGetViewSettings();
    cgptSyncCompactPreview(pre, settings.compactLineCount);
  }
  cgptRefreshSaveButtonState(pre, code, metadata);
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
