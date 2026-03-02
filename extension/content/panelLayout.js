const CGPT_PANEL_LAYOUT_TARGET_SELECTORS = ["main", "[role='main']"];
const cgptPanelLayoutState = {
  panel: null,
  toggleButton: null,
  hidden: false,
  adjustedTargets: new Set(),
  resizeObserver: null,
  listenersBound: false,
  rafId: 0,
};

function cgptGetPanelLayoutAnchor() {
  if (cgptPanelLayoutState.hidden) {
    return cgptPanelLayoutState.toggleButton;
  }
  return cgptPanelLayoutState.panel;
}

function cgptGetChatInputElement() {
  if (typeof getChatInput !== "function") return null;
  return getChatInput();
}

function cgptElementLooksLikeChatContainer(element) {
  if (!element || !element.isConnected) return false;
  if (element.id === "cgpt-code-helper-panel" || element.id === "cgpt-helper-panel-toggle") {
    return false;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width < 240 || rect.height < 160) {
    return false;
  }

  return Boolean(
    element.querySelector("[data-message-author-role]") ||
      element.querySelector("[data-testid='conversation-turn']") ||
      element.querySelector("pre") ||
      element.querySelector("textarea") ||
      element.querySelector("[data-testid='textbox']")
  );
}

function cgptGetPanelLayoutTargets() {
  const candidates = [];

  CGPT_PANEL_LAYOUT_TARGET_SELECTORS.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      if (cgptElementLooksLikeChatContainer(element)) {
        candidates.push(element);
      }
    });
  });

  if (!candidates.length) {
    const chatInput = cgptGetChatInputElement();
    const fallbackTarget = chatInput?.closest("main, [role='main']");
    if (fallbackTarget && cgptElementLooksLikeChatContainer(fallbackTarget)) {
      candidates.push(fallbackTarget);
    }
  }

  const uniqueCandidates = candidates.filter((element, index) => {
    return candidates.indexOf(element) === index;
  });

  return uniqueCandidates.filter((element) => {
    return !uniqueCandidates.some((other) => other !== element && element.contains(other));
  });
}

function cgptEnsurePanelLayoutOriginalStyles(element) {
  if (!element || !element.dataset) return;

  if (element.dataset.cgptHelperOriginalMarginRight === undefined) {
    element.dataset.cgptHelperOriginalMarginRight = element.style.marginRight || "";
  }
  if (element.dataset.cgptHelperOriginalPaddingBottom === undefined) {
    element.dataset.cgptHelperOriginalPaddingBottom = element.style.paddingBottom || "";
  }
}

function cgptRestorePanelLayoutTarget(element) {
  if (!element || !element.style || !element.dataset) return;

  if (element.dataset.cgptHelperOriginalMarginRight !== undefined) {
    element.style.marginRight = element.dataset.cgptHelperOriginalMarginRight;
  } else {
    element.style.removeProperty("margin-right");
  }

  if (element.dataset.cgptHelperOriginalPaddingBottom !== undefined) {
    element.style.paddingBottom = element.dataset.cgptHelperOriginalPaddingBottom;
  } else {
    element.style.removeProperty("padding-bottom");
  }
}

function cgptMeasurePanelLayoutBase(element) {
  cgptEnsurePanelLayoutOriginalStyles(element);
  cgptRestorePanelLayoutTarget(element);

  const styles = window.getComputedStyle(element);
  return {
    marginRight: Number.parseFloat(styles.marginRight) || 0,
    paddingBottom: Number.parseFloat(styles.paddingBottom) || 0,
  };
}

function cgptCalculatePanelLayoutReservation(anchorElement) {
  if (!anchorElement || !anchorElement.isConnected) {
    return { right: 0, bottom: 0 };
  }

  const rect = anchorElement.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return { right: 0, bottom: 0 };
  }

  const desktopSideReservation = window.innerWidth >= 1100;
  const right = desktopSideReservation
    ? Math.max(0, Math.ceil(window.innerWidth - rect.left + 20))
    : 0;
  const bottom = Math.max(0, Math.ceil(window.innerHeight - rect.top + 20));

  return {
    right,
    bottom,
  };
}

function cgptApplyPanelLayoutReservationNow() {
  const anchorElement = cgptGetPanelLayoutAnchor();
  const targets = cgptGetPanelLayoutTargets();
  const activeTargets = new Set(targets);

  if (!anchorElement || !targets.length) {
    cgptPanelLayoutState.adjustedTargets.forEach((element) => {
      cgptRestorePanelLayoutTarget(element);
    });
    cgptPanelLayoutState.adjustedTargets.clear();
    return;
  }

  const reservation = cgptCalculatePanelLayoutReservation(anchorElement);
  targets.forEach((element) => {
    const base = cgptMeasurePanelLayoutBase(element);
    element.style.marginRight = `${Math.ceil(base.marginRight + reservation.right)}px`;
    element.style.paddingBottom = `${Math.ceil(base.paddingBottom + reservation.bottom)}px`;
    cgptPanelLayoutState.adjustedTargets.add(element);
  });

  cgptPanelLayoutState.adjustedTargets.forEach((element) => {
    if (activeTargets.has(element)) return;
    cgptRestorePanelLayoutTarget(element);
    cgptPanelLayoutState.adjustedTargets.delete(element);
  });
}

function cgptSchedulePanelLayoutRefresh() {
  if (cgptPanelLayoutState.rafId) return;
  cgptPanelLayoutState.rafId = window.requestAnimationFrame(() => {
    cgptPanelLayoutState.rafId = 0;
    cgptApplyPanelLayoutReservationNow();
  });
}

function cgptEnsurePanelLayoutObservers() {
  if (!cgptPanelLayoutState.listenersBound) {
    window.addEventListener("resize", cgptSchedulePanelLayoutRefresh);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        cgptSchedulePanelLayoutRefresh();
      }
    });
    cgptPanelLayoutState.listenersBound = true;
  }

  if (typeof ResizeObserver !== "function") return;
  if (!cgptPanelLayoutState.resizeObserver) {
    cgptPanelLayoutState.resizeObserver = new ResizeObserver(() => {
      cgptSchedulePanelLayoutRefresh();
    });
  }

  cgptPanelLayoutState.resizeObserver.disconnect();
  [cgptPanelLayoutState.panel, cgptPanelLayoutState.toggleButton].forEach((element) => {
    if (element && element.isConnected) {
      cgptPanelLayoutState.resizeObserver.observe(element);
    }
  });
}

function cgptSyncPanelLayoutState({ panel, toggleButton, hidden }) {
  cgptPanelLayoutState.panel = panel || null;
  cgptPanelLayoutState.toggleButton = toggleButton || null;
  cgptPanelLayoutState.hidden = hidden === true;
  cgptEnsurePanelLayoutObservers();
  cgptSchedulePanelLayoutRefresh();
}
