function createPanelContainer() {
  const panel = document.createElement("div");
  panel.id = "cgpt-code-helper-panel";
  panel.style.position = "fixed";
  panel.style.right = "16px";
  panel.style.bottom = "80px";
  panel.style.zIndex = "9999";
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
  panel.style.maxWidth = "280px";
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

function createPanelButton(text, variant = "secondary") {
  const button = document.createElement("button");
  button.textContent = text;
  button.style.fontSize = "11px";
  button.style.padding = "4px 6px";
  button.style.borderRadius = "4px";
  button.style.cursor = "pointer";
  button.style.flexShrink = "0";
  applyPanelButtonVariant(button, variant);
  return button;
}

function applyPanelButtonVariant(button, variant) {
  if (typeof cgptApplySharedButtonVariant === "function") {
    cgptApplySharedButtonVariant(button, variant);
    return;
  }
  const palette = {
    primary: "rgba(37, 99, 235, 1)",
    accent: "rgba(124, 58, 237, 1)",
    success: "rgba(16, 185, 129, 1)",
    secondary: "rgba(75, 85, 99, 1)",
    muted: "rgba(55, 65, 81, 1)",
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

function createLineCountRow(labelText, initialValue, onCommit) {
  const MIN_LINES = 1;
  const MAX_LINES = 200;

  const row = document.createElement("label");
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.gap = "8px";
  row.style.fontSize = "11px";
  row.style.color = "rgba(255,255,255,0.8)";

  const span = document.createElement("span");
  span.textContent = labelText;
  span.style.flex = "1";
  row.appendChild(span);

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
    button.style.width = "28px";
    button.style.height = "24px";
    button.style.borderRadius = "4px";
    button.style.border = "1px solid rgba(255,255,255,0.2)";
    button.style.background = "rgba(55, 65, 81, 0.95)";
    button.style.color = "#fff";
    button.style.cursor = "pointer";
    button.style.display = "flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    return button;
  };

  const clampValue = (value) => {
    return Math.max(MIN_LINES, Math.min(MAX_LINES, value));
  };

  const commitValue = () => {
    const parsed = clampValue(Number.parseInt(input.value, 10) || MIN_LINES);
    input.value = `${parsed}`;
    onCommit(parsed);
  };

  const adjustValue = (delta) => {
    const current = clampValue(Number.parseInt(input.value, 10) || MIN_LINES);
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

  row.appendChild(controls);
  return row;
}
