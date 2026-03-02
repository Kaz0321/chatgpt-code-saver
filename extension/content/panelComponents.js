function createPanelContainer() {
  const panel = document.createElement("div");
  panel.id = "cgpt-code-helper-panel";
  panel.style.position = "fixed";
  panel.style.right = "16px";
  panel.style.bottom = "80px";
  panel.style.zIndex = "9999";
  panel.style.boxSizing = "border-box";
  panel.style.background = "rgba(32, 33, 35, 0.95)";
  panel.style.border = "1px solid rgba(255,255,255,0.1)";
  panel.style.borderRadius = "8px";
  panel.style.padding = "12px";
  panel.style.fontSize = "12px";
  panel.style.color = "#fff";
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.gap = "8px";
  panel.style.backdropFilter = "blur(8px)";
  panel.style.width = "min(280px, calc(100vw - 32px))";
  panel.style.maxWidth = "280px";
  panel.style.maxHeight = "calc(100vh - 112px)";
  panel.style.overflowY = "auto";
  return panel;
}

function createPanelTitle() {
  const title = document.createElement("div");
  title.textContent = getHelperPanelTitle();
  title.style.fontWeight = "bold";
  title.style.fontSize = "13px";
  return title;
}

function getHelperPanelTitle() {
  const manifest =
    typeof chrome !== "undefined" &&
    chrome.runtime &&
    typeof chrome.runtime.getManifest === "function"
      ? chrome.runtime.getManifest()
      : null;
  const extensionName =
    manifest && manifest.name ? manifest.name : "gpt-code-saver-extension";
  const version = manifest && manifest.version ? manifest.version : "";
  if (!version) {
    return extensionName;
  }
  return `${extensionName} ${version}`;
}

function createSectionLabel(text) {
  const label = document.createElement("div");
  label.textContent = text;
  label.style.fontSize = "11px";
  label.style.fontWeight = "bold";
  label.style.marginBottom = "2px";
  label.style.color = "rgba(255,255,255,0.8)";
  return label;
}

function createPanelButton(text, variant = "secondary", size = "sm") {
  const button =
    typeof cgptCreateSharedButton === "function"
      ? cgptCreateSharedButton(text, variant, size)
      : document.createElement("button");
  if (!button.textContent) {
    button.textContent = text;
  }
  if (typeof cgptCreateSharedButton !== "function") {
    button.style.fontSize = "11px";
    button.style.padding = "0 8px";
    button.style.minHeight = "28px";
    button.style.borderRadius = "6px";
    button.style.cursor = "pointer";
    applyPanelButtonVariant(button, variant);
  }
  button.style.flexShrink = "0";
  return button;
}

function applyPanelButtonVariant(button, variant) {
  if (typeof cgptApplySharedButtonVariant === "function") {
    cgptApplySharedButtonVariant(button, variant);
    return;
  }
  const palette = {
    primary: "rgba(37, 99, 235, 1)",
    accent: "rgba(37, 99, 235, 1)",
    success: "rgba(16, 185, 129, 1)",
    secondary: "rgba(71, 85, 105, 1)",
    muted: "rgba(71, 85, 105, 1)",
  };
  const color = palette[variant] || palette.secondary;
  button.style.background = color;
  button.style.border = "1px solid rgba(255,255,255,0.2)";
  button.style.color = "#fff";
}

function createButtonRow() {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "4px";
  row.style.width = "100%";
  return row;
}

function createLineCountControls({ initialValue, onCommit, min = 1, max = 200 }) {
  const MIN_LINES = min;
  const MAX_LINES = max;

  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.alignItems = "center";
  controls.style.gap = "4px";

  const input = document.createElement("input");
  input.type = "number";
  input.min = `${MIN_LINES}`;
  input.max = `${MAX_LINES}`;
  input.value = `${initialValue}`;
  input.style.width = "64px";
  input.style.borderRadius = "4px";
  input.style.border = "1px solid rgba(255,255,255,0.2)";
  input.style.background = "#1f2937";
  input.style.color = "#fff";
  input.style.padding = "2px 4px";
  input.style.textAlign = "center";

  const createAdjustButton = (label) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    if (typeof cgptApplySharedButtonStyle === "function") {
      cgptApplySharedButtonStyle(button, { variant: "secondary", size: "sm" });
    } else {
      button.style.borderRadius = "6px";
      button.style.border = "1px solid rgba(148,163,184,0.72)";
      button.style.background = "rgba(71, 85, 105, 0.96)";
      button.style.color = "#fff";
      button.style.cursor = "pointer";
      button.style.display = "flex";
      button.style.alignItems = "center";
      button.style.justifyContent = "center";
    }
    button.style.width = "28px";
    button.style.padding = "0";
    return button;
  };

  const clampValue = (value) => {
    return Math.max(MIN_LINES, Math.min(MAX_LINES, value));
  };

  const commitValue = () => {
    const parsedValue = Number.parseInt(input.value, 10);
    const parsed = clampValue(Number.isFinite(parsedValue) ? parsedValue : MIN_LINES);
    input.value = `${parsed}`;
    onCommit(parsed);
  };

  const adjustValue = (delta) => {
    const currentValue = Number.parseInt(input.value, 10);
    const current = clampValue(Number.isFinite(currentValue) ? currentValue : MIN_LINES);
    const nextValue = clampValue(current + delta);
    if (nextValue === current) return;
    input.value = `${nextValue}`;
    onCommit(nextValue);
  };

  const decrementButton = createAdjustButton("-");
  decrementButton.addEventListener("click", () => adjustValue(-1));
  controls.appendChild(decrementButton);

  input.addEventListener("change", commitValue);
  input.addEventListener("blur", commitValue);
  controls.appendChild(input);

  const incrementButton = createAdjustButton("+");
  incrementButton.addEventListener("click", () => adjustValue(1));
  controls.appendChild(incrementButton);

  return controls;
}
