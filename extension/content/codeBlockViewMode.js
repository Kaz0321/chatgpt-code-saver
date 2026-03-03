const CGPT_CODE_WRAPPER_CLASS = "cgpt-code-wrapper";
const CGPT_CODE_COLLAPSED_CLASS = "cgpt-code-wrapper--collapsed";
const CGPT_CODE_PREVIEW_SELECTOR = "[data-cgpt-code-preview='1']";
let cgptCodeBlockStylesInjected = false;
const CGPT_VIEW_MODE = {
  COMPACT: "compact",
  EXPANDED: "expanded",
};
const FALLBACK_VIEW_SETTINGS = {
  compactLineCount: 1,
};

function cgptNormalizePositiveNumber(value) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return parsed;
}

function cgptCalculateCompactHeight(lineCount, lineHeight, buttonOverlayOffset, verticalPadding = 0) {
  const safeLineCount = Math.max(0, Number.isFinite(lineCount) ? lineCount : 0);
  const safeLineHeight = cgptNormalizePositiveNumber(lineHeight);
  const safeVerticalPadding = Math.max(0, Number.isFinite(verticalPadding) ? verticalPadding : 0);
  const codeHeight = safeLineCount * safeLineHeight + safeVerticalPadding;
  const safeOverlayOffset = Math.max(0, Number.isFinite(buttonOverlayOffset) ? buttonOverlayOffset : 0);
  return Math.max(codeHeight, safeOverlayOffset);
}

function cgptEnsureCodeBlockStyles() {
  if (cgptCodeBlockStylesInjected) return;
  const style = document.createElement("style");
  style.dataset.cgptCodeStyles = "1";
  style.textContent = `
.${CGPT_CODE_WRAPPER_CLASS} {
  position: relative;
}
.${CGPT_CODE_WRAPPER_CLASS} ${CGPT_CODE_PREVIEW_SELECTOR} {
  display: none;
}
.${CGPT_CODE_WRAPPER_CLASS} [data-cgpt-code-actions="1"] {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.15s ease, visibility 0.15s ease;
}
.${CGPT_CODE_WRAPPER_CLASS}:hover [data-cgpt-code-actions="1"],
.${CGPT_CODE_WRAPPER_CLASS}:focus-within [data-cgpt-code-actions="1"] {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}
.${CGPT_CODE_WRAPPER_CLASS}.${CGPT_CODE_COLLAPSED_CLASS} {
  border-bottom: 4px solid rgba(255, 255, 255, 0.25);
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
}
.${CGPT_CODE_WRAPPER_CLASS}.${CGPT_CODE_COLLAPSED_CLASS}::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 48px;
  background: linear-gradient(180deg, rgba(32, 33, 35, 0) 0%, rgba(32, 33, 35, 0.85) 100%);
  pointer-events: none;
}
.${CGPT_CODE_WRAPPER_CLASS}.${CGPT_CODE_COLLAPSED_CLASS}::after {
  content: "…";
  position: absolute;
  right: 12px;
  bottom: 8px;
  font-size: 20px;
  line-height: 1;
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
  pointer-events: none;
}
`;
  (document.head || document.documentElement).appendChild(style);
  cgptCodeBlockStylesInjected = true;
}

function cgptWrapPreWithRelativeContainer(pre) {
  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  wrapper.dataset.cgptCodeWrapper = "1";
  wrapper.classList.add(CGPT_CODE_WRAPPER_CLASS);
  if (pre.parentNode) {
    pre.parentNode.insertBefore(wrapper, pre);
  }
  wrapper.appendChild(pre);
  return wrapper;
}

function cgptGetCollapsibleElement(pre) {
  if (!pre) return null;
  const parent = pre.parentElement;
  if (parent && parent.dataset.cgptCodeWrapper === "1") {
    return parent;
  }
  return pre;
}

function cgptRememberOriginalPreStyles(pre) {
  const collapsibleEl = cgptGetCollapsibleElement(pre);
  if (!collapsibleEl) return;
  if (pre.dataset.cgptOriginalOverflow === undefined) {
    pre.dataset.cgptOriginalOverflow = collapsibleEl.style.overflow || "";
  }
  if (pre.dataset.cgptOriginalMaxHeight === undefined) {
    pre.dataset.cgptOriginalMaxHeight = collapsibleEl.style.maxHeight || "";
  }
}

function cgptEnsureCollapsibleState(pre) {
  if (!pre) return false;
  if (pre.dataset.cgptCollapsibleApplied !== "1") {
    cgptRememberOriginalPreStyles(pre);
    pre.dataset.cgptCollapsibleApplied = "1";
  }
  return true;
}

function cgptGetViewModeFromDataset(pre) {
  if (!pre) return CGPT_VIEW_MODE.EXPANDED;
  return pre.dataset.cgptViewMode || CGPT_VIEW_MODE.EXPANDED;
}

function cgptNormalizeLineHeight(style) {
  if (!style) {
    return null;
  }
  const rawLineHeight = style.lineHeight;
  if (!rawLineHeight || rawLineHeight === "normal") {
    return null;
  }
  const numericLineHeight = parseFloat(rawLineHeight);
  if (!Number.isFinite(numericLineHeight)) {
    return null;
  }
  if (/px$/i.test(rawLineHeight)) {
    return numericLineHeight;
  }
  const fontSize = parseFloat(style.fontSize);
  if (Number.isFinite(fontSize) && fontSize > 0) {
    return fontSize * numericLineHeight;
  }
  return null;
}

function cgptGetCodeLineHeight(pre) {
  const code =
    typeof cgptGetCodeTextContainer === "function" ? cgptGetCodeTextContainer(pre) || pre : pre;
  const style = window.getComputedStyle ? window.getComputedStyle(code) : null;
  const normalizedLineHeight = cgptNormalizeLineHeight(style);
  if (Number.isFinite(normalizedLineHeight) && normalizedLineHeight > 0) {
    return normalizedLineHeight;
  }
  const fallbackFontSize = style ? parseFloat(style.fontSize) || 14 : 14;
  return fallbackFontSize * 1.4;
}

function cgptRememberOriginalElementDisplay(element) {
  if (!element || !element.style) return;
  if (element.dataset.cgptOriginalDisplay === undefined) {
    element.dataset.cgptOriginalDisplay = element.style.display || "";
  }
}

function cgptSetElementDisplay(element, displayValue) {
  if (!element || !element.style) return;
  cgptRememberOriginalElementDisplay(element);
  element.style.display = displayValue;
}

function cgptRestoreElementDisplay(element) {
  if (!element || !element.style) return;
  cgptRememberOriginalElementDisplay(element);
  element.style.display = element.dataset.cgptOriginalDisplay || "";
}

function cgptSetCollapsedVisualState(element, isCollapsed) {
  if (!element || !element.classList) return;
  element.classList.add(CGPT_CODE_WRAPPER_CLASS);
  element.classList.toggle(CGPT_CODE_COLLAPSED_CLASS, Boolean(isCollapsed));
}

function cgptUpdateViewButtonStates(pre) {
  const buttons = pre && pre.cgptViewButtons;
  if (!buttons) return;
  const mode = cgptGetViewModeFromDataset(pre);
  const disabledStates = {
    shrinkBtn: mode === CGPT_VIEW_MODE.COMPACT,
    expandBtn: mode === CGPT_VIEW_MODE.EXPANDED,
  };
  Object.keys(buttons).forEach((key) => {
    const btn = buttons[key];
    if (btn) {
      if (typeof cgptSetSharedButtonDisabled === "function") {
        cgptSetSharedButtonDisabled(btn, Boolean(disabledStates[key]));
      } else {
        btn.disabled = Boolean(disabledStates[key]);
      }
    }
  });
}

function cgptGetButtonOverlayOffset(pre) {
  if (!pre) return 0;
  if (typeof pre.cgptButtonOverlayOffset === "number") {
    return pre.cgptButtonOverlayOffset;
  }
  const container = pre.cgptButtonContainer;
  if (!container || typeof cgptCalculateButtonOverlayOffset !== "function") {
    return 0;
  }
  const offset = cgptCalculateButtonOverlayOffset(container);
  pre.cgptButtonOverlayOffset = offset;
  return offset;
}

function cgptSetPreViewMode(pre, mode) {
  if (!pre || !cgptEnsureCollapsibleState(pre)) return;
  const collapsibleEl = cgptGetCollapsibleElement(pre);
  if (!collapsibleEl) return;
  const viewSettings =
    typeof cgptGetViewSettings === "function" ? cgptGetViewSettings() : FALLBACK_VIEW_SETTINGS;
  pre.dataset.cgptViewMode = mode;
  const host =
    typeof cgptGetCompactContentHost === "function" ? cgptGetCompactContentHost(pre) : pre;
  const preview = host && host.parentElement
    ? host.parentElement.querySelector(":scope > [data-cgpt-code-preview='1']")
    : null;
  const metadata = pre.cgptMetadata || null;
  if (mode === CGPT_VIEW_MODE.EXPANDED) {
    collapsibleEl.style.maxHeight = pre.dataset.cgptOriginalMaxHeight || "";
    collapsibleEl.style.overflow = pre.dataset.cgptOriginalOverflow || "";
    cgptRestoreElementDisplay(host);
    if (preview) {
      cgptSetElementDisplay(preview, "none");
    }
    if (typeof cgptSyncCompactHeaderPath === "function") {
      cgptSyncCompactHeaderPath(pre, metadata, mode);
    }
    cgptSetCollapsedVisualState(collapsibleEl, false);
  } else {
    const lineCount = viewSettings.compactLineCount;
    const parsedLines = Number.parseInt(lineCount, 10);
    const normalizedLines = Number.isFinite(parsedLines)
      ? Math.max(0, parsedLines)
      : FALLBACK_VIEW_SETTINGS.compactLineCount;
    if (typeof cgptSyncCompactPreview === "function") {
      cgptSyncCompactPreview(pre, normalizedLines);
    }
    cgptSetElementDisplay(host, "none");
    if (preview) {
      cgptSetElementDisplay(preview, "block");
    }
    collapsibleEl.style.maxHeight = "";
    collapsibleEl.style.overflow = "visible";
    if (typeof cgptSyncCompactHeaderPath === "function") {
      cgptSyncCompactHeaderPath(pre, metadata, mode);
    }
    cgptSetCollapsedVisualState(collapsibleEl, true);
  }
  cgptUpdateViewButtonStates(pre);
}

function cgptGetPreViewMode(pre) {
  return cgptGetViewModeFromDataset(pre);
}

function cgptGetDecoratedPreElements() {
  return Array.from(document.querySelectorAll("pre[data-cgpt-code-helper-applied='1']"));
}

function cgptApplyViewModeToAll(mode) {
  cgptGetDecoratedPreElements().forEach((pre) => {
    cgptSetPreViewMode(pre, mode);
  });
}

function cgptReapplyViewMode(mode) {
  cgptGetDecoratedPreElements().forEach((pre) => {
    if (cgptGetPreViewMode(pre) === mode) {
      cgptSetPreViewMode(pre, mode);
    }
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptCalculateCompactHeight,
  };
}
