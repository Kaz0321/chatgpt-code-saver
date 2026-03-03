// Shared state for the content scripts

const cgptTemplateState = {
  templates: [],
  selectedTemplateId: null,
};
const CGPT_DEFAULT_ASYNC_FALLBACK_TIMEOUT_MS = 1500;

function cgptGetTemplates() {
  return cgptTemplateState.templates;
}

function cgptSetTemplates(newTemplates) {
  cgptTemplateState.templates = Array.isArray(newTemplates)
    ? newTemplates
    : [];
}

function cgptGetSelectedTemplateId() {
  return cgptTemplateState.selectedTemplateId;
}

function cgptSetSelectedTemplateId(templateId) {
  cgptTemplateState.selectedTemplateId = templateId;
}

function cgptGenerateTemplateId() {
  return "tpl_" + Math.random().toString(36).slice(2);
}

function cgptGetAsyncFallbackTimeoutMs() {
  const configured =
    typeof globalThis !== "undefined"
      ? Number.parseInt(globalThis.CGPT_ASYNC_FALLBACK_TIMEOUT_MS, 10)
      : NaN;
  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }
  return CGPT_DEFAULT_ASYNC_FALLBACK_TIMEOUT_MS;
}

function cgptCreateAsyncGuard(callback, options = {}) {
  const timeoutMs =
    Number.isFinite(Number.parseInt(options.timeoutMs, 10)) &&
    Number.parseInt(options.timeoutMs, 10) > 0
      ? Number.parseInt(options.timeoutMs, 10)
      : cgptGetAsyncFallbackTimeoutMs();
  let settled = false;
  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    if (typeof options.onTimeout === "function") {
      options.onTimeout();
    }
    if (typeof callback === "function") {
      callback(options.timeoutValue);
    }
  }, timeoutMs);

  return (...args) => {
    if (settled) return false;
    settled = true;
    clearTimeout(timer);
    if (typeof callback === "function") {
      callback(...args);
    }
    return true;
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptGetTemplates,
    cgptSetTemplates,
    cgptGetSelectedTemplateId,
    cgptSetSelectedTemplateId,
    cgptGenerateTemplateId,
    cgptGetAsyncFallbackTimeoutMs,
    cgptCreateAsyncGuard,
  };
}
