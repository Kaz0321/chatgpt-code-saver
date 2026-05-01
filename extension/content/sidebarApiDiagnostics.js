let cgptSidebarApiDiagnostics = null;

function cgptClearSidebarApiDiagnostics() {
  cgptSidebarApiDiagnostics = null;
}

function cgptSetSidebarApiDiagnostics(nextDiagnostics = null) {
  if (!nextDiagnostics || typeof nextDiagnostics !== "object") {
    cgptSidebarApiDiagnostics = null;
    return;
  }
  cgptSidebarApiDiagnostics = {
    timestamp: new Date().toISOString(),
    phase: String(nextDiagnostics.phase || "unknown"),
    authMode: String(nextDiagnostics.authMode || "cookie"),
    status: Number.isFinite(Number(nextDiagnostics.status)) ? Number(nextDiagnostics.status) : 0,
    endpoint: String(nextDiagnostics.endpoint || ""),
    message: String(nextDiagnostics.message || "unknown"),
    endpointTried: Array.isArray(nextDiagnostics.endpointTried)
      ? nextDiagnostics.endpointTried.map((item) => ({
          url: String((item && item.url) || ""),
          status: Number.isFinite(Number(item && item.status)) ? Number(item.status) : 0,
          ok: Boolean(item && item.ok),
          shapeMatched: Boolean(item && item.shapeMatched),
        }))
      : [],
    payloadKeys: Array.isArray(nextDiagnostics.payloadKeys)
      ? nextDiagnostics.payloadKeys.map((item) => String(item || ""))
      : [],
  };
}

function cgptGetSidebarApiDiagnostics() {
  return cgptSidebarApiDiagnostics
    ? JSON.parse(JSON.stringify(cgptSidebarApiDiagnostics))
    : null;
}

function cgptExportSidebarApiDiagnostics() {
  const diagnostics = cgptGetSidebarApiDiagnostics();
  if (!diagnostics) {
    return false;
  }
  return cgptDownloadSidebarApiDebugJson(diagnostics);
}

async function cgptCopySidebarApiDebugJson(payload) {
  const content = JSON.stringify(payload, null, 2);
  if (!content) {
    return false;
  }
  const clipboard = globalThis.navigator && globalThis.navigator.clipboard;
  if (clipboard && typeof clipboard.writeText === "function") {
    try {
      await clipboard.writeText(content);
      return true;
    } catch (_error) {
    }
  }
  if (typeof document === "undefined" || !document.body) {
    return false;
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = content;
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return Boolean(ok);
  } catch (_error) {
    return false;
  }
}

function cgptDownloadSidebarApiDebugJson(payload) {
  try {
    const timestamp = String((payload && payload.timestamp) || new Date().toISOString());
    const safeTimestamp = timestamp.replace(/[:.]/g, "-");
    const fileName = `chatgpt-sidebar-api-debug-${safeTimestamp}.json`;
    const content = JSON.stringify(payload, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch (_error) {
    return false;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptClearSidebarApiDiagnostics,
    cgptCopySidebarApiDebugJson,
    cgptDownloadSidebarApiDebugJson,
    cgptExportSidebarApiDiagnostics,
    cgptGetSidebarApiDiagnostics,
    cgptSetSidebarApiDiagnostics,
  };
}
