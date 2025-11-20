const CGPT_LIGHTWEIGHT_CLASS = "cgpt-lightweight";
const CGPT_LIGHTWEIGHT_POLL_INTERVAL = 500;
let cgptLightweightStyleInjected = false;
let cgptLastIsGenerating = null;
let cgptLightweightInterval = null;

function cgptEnsureLightweightStyles() {
  if (cgptLightweightStyleInjected) return;
  const style = document.createElement("style");
  style.textContent = `
/* 軽量モード中のコードブロック軽量化 */
body.${CGPT_LIGHTWEIGHT_CLASS} pre code {
  white-space: pre;
  font-feature-settings: "kern" 0;
}

/* 長大コードはホバー時以外は折りたたむ（拡張側でExpanded指定時は除外） */
body.${CGPT_LIGHTWEIGHT_CLASS} pre:not(:hover):not([data-cgpt-view-mode="expanded"]) {
  max-height: 350px;
  overflow: hidden;
}

/* 構文ハイライトを事実上オフにして描画負荷を下げる */
body.${CGPT_LIGHTWEIGHT_CLASS} pre code span {
  color: inherit !important;
  background: none !important;
}

/* スムーズスクロールを無効化（自動スクロール負荷軽減） */
body.${CGPT_LIGHTWEIGHT_CLASS} html,
body.${CGPT_LIGHTWEIGHT_CLASS} :root {
  scroll-behavior: auto !important;
}

/* GPU負荷軽減（影やぼかしを除去） */
body.${CGPT_LIGHTWEIGHT_CLASS} * {
  backdrop-filter: none !important;
  text-shadow: none !important;
  box-shadow: none !important;
}
`;
  (document.head || document.documentElement).appendChild(style);
  cgptLightweightStyleInjected = true;
}

function cgptIsChatGenerating() {
  return Boolean(
    document.querySelector('button[aria-label*="停止"]') ||
      document.querySelector('button[aria-label*="Stop"]')
  );
}

function cgptToggleLightweightMode(isEnabled) {
  if (!document || !document.body || !document.body.classList) return;
  if (isEnabled) {
    document.body.classList.add(CGPT_LIGHTWEIGHT_CLASS);
  } else {
    document.body.classList.remove(CGPT_LIGHTWEIGHT_CLASS);
  }
}

function cgptStopLightweightPolling() {
  if (cgptLightweightInterval) {
    clearInterval(cgptLightweightInterval);
    cgptLightweightInterval = null;
  }
  cgptLastIsGenerating = null;
}

function cgptStartLightweightPolling() {
  if (cgptLightweightInterval) return;
  const initialGenerating = cgptIsChatGenerating();
  cgptLastIsGenerating = initialGenerating;
  cgptToggleLightweightMode(Boolean(initialGenerating));
  cgptLightweightInterval = setInterval(() => {
    const nowGenerating = cgptIsChatGenerating();
    if (nowGenerating === cgptLastIsGenerating) {
      return;
    }
    cgptLastIsGenerating = nowGenerating;
    cgptToggleLightweightMode(Boolean(nowGenerating));
  }, CGPT_LIGHTWEIGHT_POLL_INTERVAL);
}

function cgptApplyLightweightMode(mode) {
  const selectedMode = mode || CGPT_DEFAULT_LIGHTWEIGHT_MODE;
  if (selectedMode === CGPT_LIGHTWEIGHT_MODES.LIGHT) {
    cgptEnsureLightweightStyles();
    cgptStopLightweightPolling();
    cgptToggleLightweightMode(true);
    return;
  }
  if (selectedMode === CGPT_LIGHTWEIGHT_MODES.NORMAL) {
    cgptStopLightweightPolling();
    cgptToggleLightweightMode(false);
    return;
  }
  cgptEnsureLightweightStyles();
  cgptStartLightweightPolling();
}

function cgptStartLightweightModeWatcher() {
  const resolveMode =
    typeof cgptGetLightweightMode === "function"
      ? cgptGetLightweightMode
      : () => CGPT_DEFAULT_LIGHTWEIGHT_MODE;
  cgptApplyLightweightMode(resolveMode());
}
