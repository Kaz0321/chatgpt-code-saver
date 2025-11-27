const CGPT_DEFAULT_EXTENSION_ENABLED = true;
let cgptExtensionEnabledState = CGPT_DEFAULT_EXTENSION_ENABLED;

function cgptIsExtensionEnabled() {
  return cgptExtensionEnabledState !== false;
}

function cgptHasExtensionToggleStorage() {
  return typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync;
}

function cgptLoadExtensionEnabled(callback) {
  if (!cgptHasExtensionToggleStorage()) {
    callback?.(cgptIsExtensionEnabled());
    return;
  }
  chrome.storage.sync.get(["cgptExtensionEnabled"], (result) => {
    if (result && typeof result.cgptExtensionEnabled === "boolean") {
      cgptExtensionEnabledState = result.cgptExtensionEnabled;
    }
    callback?.(cgptIsExtensionEnabled());
  });
}

function cgptUpdateExtensionEnabled(nextEnabled, callback) {
  cgptExtensionEnabledState = nextEnabled !== false;
  if (!cgptHasExtensionToggleStorage()) {
    callback?.(cgptIsExtensionEnabled());
    return;
  }
  chrome.storage.sync.set({ cgptExtensionEnabled: cgptExtensionEnabledState }, () => {
    callback?.(cgptIsExtensionEnabled());
  });
}

function cgptRenderExtensionDisabledEntryPoint() {
  const existing = document.getElementById("cgpt-helper-extension-enable");
  if (existing) return existing;

  const button = document.createElement("button");
  button.id = "cgpt-helper-extension-enable";
  button.type = "button";
  button.textContent = "拡張機能を有効化";
  button.style.position = "fixed";
  button.style.right = "16px";
  button.style.bottom = "20px";
  button.style.zIndex = "9999";
  button.style.padding = "10px 12px";
  button.style.borderRadius = "10px";
  button.style.border = "1px solid rgba(255,255,255,0.2)";
  button.style.background = "rgba(32, 33, 35, 0.95)";
  button.style.color = "#fff";
  button.style.fontSize = "12px";
  button.style.cursor = "pointer";
  button.style.boxShadow = "0 6px 16px rgba(0,0,0,0.35)";

  button.addEventListener("click", () => {
    cgptUpdateExtensionEnabled(true, () => {
      window.location.reload();
    });
  });

  document.body.appendChild(button);
  return button;
}
