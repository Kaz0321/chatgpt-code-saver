const CGPT_DEFAULT_PANEL_VISIBILITY = { hidden: false };
let cgptPanelVisibilityState = { ...CGPT_DEFAULT_PANEL_VISIBILITY };

function cgptGetPanelVisibility() {
  return { ...cgptPanelVisibilityState };
}

function cgptMergePanelVisibility(nextState) {
  if (!nextState || typeof nextState !== "object") {
    return;
  }
  if (typeof nextState.hidden === "boolean") {
    cgptPanelVisibilityState.hidden = nextState.hidden;
  }
}

function cgptHasPanelVisibilityStorage() {
  return typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync;
}

function cgptLoadPanelVisibility(callback) {
  if (!cgptHasPanelVisibilityStorage()) {
    callback?.(cgptGetPanelVisibility());
    return;
  }
  chrome.storage.sync.get(["cgptPanelVisibility"], (result) => {
    if (result && result.cgptPanelVisibility) {
      cgptMergePanelVisibility(result.cgptPanelVisibility);
    }
    callback?.(cgptGetPanelVisibility());
  });
}

function cgptUpdatePanelVisibility(nextState, callback) {
  cgptMergePanelVisibility(nextState);
  if (!cgptHasPanelVisibilityStorage()) {
    callback?.(cgptGetPanelVisibility());
    return;
  }
  chrome.storage.sync.set({ cgptPanelVisibility: cgptPanelVisibilityState }, () => {
    callback?.(cgptGetPanelVisibility());
  });
}

function cgptCreatePanelHeader({ onHide }) {
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.gap = "8px";

  const title = createPanelTitle();
  title.style.flex = "1";
  header.appendChild(title);

  const hideButton = createPanelButton("Hide", "ghost");
  hideButton.style.padding = "2px 6px";
  hideButton.style.lineHeight = "1.3";
  hideButton.addEventListener("click", () => {
    onHide?.();
  });
  header.appendChild(hideButton);

  return header;
}

function cgptCreatePanelToggleButton() {
  const existing = document.getElementById("cgpt-helper-panel-toggle");
  if (existing) return existing;

  const button = document.createElement("button");
  button.id = "cgpt-helper-panel-toggle";
  button.textContent = "Tools";
  button.style.position = "fixed";
  button.style.right = "16px";
  button.style.bottom = "16px";
  button.style.zIndex = "9999";
  button.style.width = "48px";
  button.style.height = "48px";
  button.style.padding = "0";
  button.style.borderRadius = "999px";
  button.style.fontSize = "11px";
  button.style.fontWeight = "600";
  button.style.cursor = "pointer";
  button.style.display = "flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";
  if (typeof cgptApplySurfaceStyle === "function") {
    cgptApplySurfaceStyle(button, "panel");
  } else {
    button.style.border = "1px solid rgba(255,255,255,0.15)";
    button.style.background = "rgba(32, 33, 35, 0.9)";
    button.style.color = "#fff";
    button.style.boxShadow = "0 4px 12px rgba(0,0,0,0.35)";
  }
  return button;
}

function cgptApplyPanelVisibility(panel, { hidden, toggleButton }) {
  const applyHiddenState = (isHidden) => {
    panel.style.display = isHidden ? "none" : "flex";
    if (toggleButton) {
      toggleButton.style.display = "flex";
      toggleButton.setAttribute("aria-pressed", isHidden ? "false" : "true");
      toggleButton.title = isHidden ? "Show tools" : "Hide tools";
    }
    if (typeof cgptSyncPanelLayoutState === "function") {
      cgptSyncPanelLayoutState({ panel, toggleButton, hidden: isHidden });
    }
  };
  applyHiddenState(hidden);
  return applyHiddenState;
}
