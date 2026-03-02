const cgptPanelLayoutState = {
  panel: null,
  toggleButton: null,
  hidden: false,
  bound: false,
};

function cgptUpdatePanelLayout() {
  const main = document.querySelector("main");
  const { panel, hidden } = cgptPanelLayoutState;
  if (!main) return;

  if (!main.dataset.cgptPanelLayoutBound) {
    main.dataset.cgptPanelLayoutBound = "1";
    main.dataset.cgptPanelLayoutOriginalMarginRight = main.style.marginRight || "";
    main.dataset.cgptPanelLayoutOriginalPaddingBottom = main.style.paddingBottom || "";
  }

  const restore = () => {
    main.style.marginRight = main.dataset.cgptPanelLayoutOriginalMarginRight || "";
    main.style.paddingBottom = main.dataset.cgptPanelLayoutOriginalPaddingBottom || "";
  };

  if (!panel || hidden || panel.style.display === "none") {
    restore();
    return;
  }

  const panelRect = panel.getBoundingClientRect();
  const reserveWidth = Math.ceil(panelRect.width + 32);
  const isWideLayout = window.innerWidth >= 1100;
  if (isWideLayout) {
    main.style.marginRight = `${reserveWidth}px`;
  } else {
    main.style.marginRight = main.dataset.cgptPanelLayoutOriginalMarginRight || "";
  }

  const originalPaddingBottom =
    parseFloat(main.dataset.cgptPanelLayoutOriginalPaddingBottom || "0") || 0;
  const requiredPaddingBottom = Math.max(originalPaddingBottom, 120);
  main.style.paddingBottom = `${requiredPaddingBottom}px`;
}

function cgptEnsurePanelLayoutBinding() {
  if (cgptPanelLayoutState.bound) return;
  cgptPanelLayoutState.bound = true;
  window.addEventListener("resize", () => {
    cgptUpdatePanelLayout();
  });
}

function cgptSyncPanelLayoutState({ panel, toggleButton, hidden }) {
  cgptPanelLayoutState.panel = panel || null;
  cgptPanelLayoutState.toggleButton = toggleButton || null;
  cgptPanelLayoutState.hidden = hidden === true;
  cgptEnsurePanelLayoutBinding();
  cgptUpdatePanelLayout();
}
