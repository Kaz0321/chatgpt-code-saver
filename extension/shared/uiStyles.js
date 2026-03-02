const CGPT_BUTTON_BASE_TOKENS = {
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  fontWeight: "600",
  borderRadius: "6px",
  gap: "6px",
  lineHeight: "1.2",
  focusInset: "0 0 0 2px rgba(17, 24, 39, 0.96)",
};

const CGPT_BUTTON_SIZE_TOKENS = {
  sm: { minHeight: "28px", fontSize: "11px", padding: "0 8px" },
  md: { minHeight: "32px", fontSize: "12px", padding: "0 10px" },
  lg: { minHeight: "36px", fontSize: "12px", padding: "0 12px" },
};

const CGPT_BUTTON_PALETTE = {
  primary: {
    background: "#2563eb",
    hoverBackground: "#1d4ed8",
    activeBackground: "#1e40af",
    color: "#ffffff",
    border: "#1d4ed8",
    hoverBorder: "#1e40af",
    activeBorder: "#1e3a8a",
    focusRing: "#93c5fd",
  },
  secondary: {
    background: "#475569",
    hoverBackground: "#64748b",
    activeBackground: "#334155",
    color: "#f8fafc",
    border: "#94a3b8",
    hoverBorder: "#cbd5e1",
    activeBorder: "#94a3b8",
    focusRing: "#cbd5e1",
  },
  success: {
    background: "#047857",
    hoverBackground: "#065f46",
    activeBackground: "#064e3b",
    color: "#ffffff",
    border: "#065f46",
    hoverBorder: "#064e3b",
    activeBorder: "#022c22",
    focusRing: "#6ee7b7",
  },
  danger: {
    background: "#b91c1c",
    hoverBackground: "#991b1b",
    activeBackground: "#7f1d1d",
    color: "#ffffff",
    border: "#991b1b",
    hoverBorder: "#7f1d1d",
    activeBorder: "#7f1d1d",
    focusRing: "#fca5a5",
  },
  ghost: {
    background: "rgba(15, 23, 42, 0.82)",
    hoverBackground: "rgba(30, 41, 59, 0.92)",
    activeBackground: "rgba(51, 65, 85, 0.96)",
    color: "#f8fafc",
    border: "rgba(148, 163, 184, 0.72)",
    hoverBorder: "rgba(226, 232, 240, 0.9)",
    activeBorder: "rgba(226, 232, 240, 0.96)",
    focusRing: "#93c5fd",
  },
  disabled: {
    background: "#1f2937",
    hoverBackground: "#1f2937",
    activeBackground: "#1f2937",
    color: "#9ca3af",
    border: "#374151",
    hoverBorder: "#374151",
    activeBorder: "#374151",
    focusRing: "#4b5563",
  },
};

const CGPT_BUTTON_VARIANT_ALIASES = {
  accent: "primary",
  muted: "secondary",
  neutral: "secondary",
  warning: "danger",
};

function cgptNormalizeButtonVariant(variant = "secondary") {
  const alias = CGPT_BUTTON_VARIANT_ALIASES[variant];
  const normalized = alias || variant;
  return CGPT_BUTTON_PALETTE[normalized] ? normalized : "secondary";
}

function cgptGetButtonPaletteEntry(variant) {
  return CGPT_BUTTON_PALETTE[cgptNormalizeButtonVariant(variant)] || CGPT_BUTTON_PALETTE.secondary;
}

function cgptGetButtonSizeEntry(size = "sm") {
  return CGPT_BUTTON_SIZE_TOKENS[size] || CGPT_BUTTON_SIZE_TOKENS.sm;
}

function cgptEnsureSharedButtonObservers(button) {
  if (!button || button.__cgptSharedButtonBound) return;
  const render = () => cgptRenderSharedButton(button);
  button.addEventListener("mouseenter", () => {
    if (button.disabled) return;
    button.dataset.cgptButtonHovered = "1";
    render();
  });
  button.addEventListener("mouseleave", () => {
    button.dataset.cgptButtonHovered = "0";
    button.dataset.cgptButtonPressed = "0";
    render();
  });
  button.addEventListener("mousedown", (event) => {
    if (button.disabled || event.button !== 0) return;
    button.dataset.cgptButtonPressed = "1";
    render();
  });
  button.addEventListener("mouseup", () => {
    button.dataset.cgptButtonPressed = "0";
    render();
  });
  button.addEventListener("focus", () => {
    button.dataset.cgptButtonFocused = "1";
    render();
  });
  button.addEventListener("blur", () => {
    button.dataset.cgptButtonFocused = "0";
    button.dataset.cgptButtonPressed = "0";
    render();
  });
  button.addEventListener("keydown", (event) => {
    if (button.disabled) return;
    if (event.key === " " || event.key === "Enter") {
      button.dataset.cgptButtonPressed = "1";
      render();
    }
  });
  button.addEventListener("keyup", () => {
    button.dataset.cgptButtonPressed = "0";
    render();
  });
  if (typeof MutationObserver === "function") {
    const observer = new MutationObserver(() => render());
    observer.observe(button, { attributes: true, attributeFilter: ["disabled"] });
    button.__cgptSharedButtonObserver = observer;
  }
  button.__cgptSharedButtonBound = true;
}

function cgptResolveSharedButtonPalette(button) {
  if (!button) return CGPT_BUTTON_PALETTE.secondary;
  if (button.__cgptSharedButtonCustomPalette) {
    return button.__cgptSharedButtonCustomPalette;
  }
  if (button.disabled) {
    return CGPT_BUTTON_PALETTE.disabled;
  }
  return cgptGetButtonPaletteEntry(button.dataset.cgptButtonVariant);
}

function cgptGetSharedButtonVisualState(button, palette) {
  if (!button || button.disabled) {
    return {
      background: palette.background,
      border: palette.border,
      color: palette.color,
      boxShadow: "none",
      transform: "translateY(0)",
      opacity: "1",
    };
  }
  const isPressed = button.dataset.cgptButtonPressed === "1";
  const isHovered = button.dataset.cgptButtonHovered === "1";
  const isFocused = button.dataset.cgptButtonFocused === "1";
  const background = isPressed
    ? palette.activeBackground || palette.hoverBackground || palette.background
    : isHovered
      ? palette.hoverBackground || palette.background
      : palette.background;
  const border = isPressed
    ? palette.activeBorder || palette.hoverBorder || palette.border
    : isHovered
      ? palette.hoverBorder || palette.border
      : palette.border;
  const color = isPressed
    ? palette.activeColor || palette.hoverColor || palette.color
    : isHovered
      ? palette.hoverColor || palette.color
      : palette.color;
  const boxShadow = isFocused
    ? `${CGPT_BUTTON_BASE_TOKENS.focusInset}, 0 0 0 4px ${palette.focusRing || "#93c5fd"}`
    : "none";
  return {
    background,
    border,
    color,
    boxShadow,
    transform: isPressed ? "translateY(1px)" : "translateY(0)",
    opacity: "1",
  };
}

function cgptRenderSharedButton(button) {
  if (!button || !button.style) return;
  const size = cgptGetButtonSizeEntry(button.dataset.cgptButtonSize);
  const palette = cgptResolveSharedButtonPalette(button);
  const visualState = button.disabled
    ? {
      background: palette.background,
      border: palette.border,
      color: palette.color,
      boxShadow: "none",
      transform: "translateY(0)",
      opacity: "0.64",
    }
    : cgptGetSharedButtonVisualState(button, palette);

  button.style.fontFamily = CGPT_BUTTON_BASE_TOKENS.fontFamily;
  button.style.fontWeight = CGPT_BUTTON_BASE_TOKENS.fontWeight;
  button.style.fontSize = size.fontSize;
  button.style.lineHeight = CGPT_BUTTON_BASE_TOKENS.lineHeight;
  button.style.minHeight = size.minHeight;
  button.style.padding = size.padding;
  button.style.borderRadius = CGPT_BUTTON_BASE_TOKENS.borderRadius;
  button.style.border = `1px solid ${visualState.border}`;
  button.style.background = visualState.background;
  button.style.color = visualState.color;
  button.style.display = "inline-flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";
  button.style.gap = CGPT_BUTTON_BASE_TOKENS.gap;
  button.style.boxSizing = "border-box";
  button.style.whiteSpace = "nowrap";
  button.style.transition = [
    "background-color 0.15s ease",
    "border-color 0.15s ease",
    "color 0.15s ease",
    "box-shadow 0.15s ease",
    "transform 0.1s ease",
    "opacity 0.15s ease",
  ].join(", ");
  button.style.cursor = button.disabled ? "not-allowed" : "pointer";
  button.style.opacity = visualState.opacity;
  button.style.boxShadow = visualState.boxShadow;
  button.style.transform = visualState.transform;
  button.style.outline = "none";
  button.style.textShadow = button.disabled ? "none" : "0 1px 1px rgba(15, 23, 42, 0.28)";
}

function cgptApplySharedButtonStyle(button, options = {}) {
  if (!button || !button.style) return button;
  const { variant = "secondary", size = "sm" } = options;
  if (!button.type) {
    button.type = "button";
  }
  button.dataset.cgptButtonVariant = cgptNormalizeButtonVariant(variant);
  button.dataset.cgptButtonSize = CGPT_BUTTON_SIZE_TOKENS[size] ? size : "sm";
  cgptEnsureSharedButtonObservers(button);
  cgptRenderSharedButton(button);
  return button;
}

function cgptCreateSharedButton(label, variant = "secondary", size = "sm") {
  const button = document.createElement("button");
  button.textContent = label;
  return cgptApplySharedButtonStyle(button, { variant, size });
}

function cgptApplySharedButtonVariant(button, variant = "secondary") {
  if (!button || !button.style) return;
  cgptApplySharedButtonStyle(button, {
    variant,
    size: button.dataset.cgptButtonSize || "sm",
  });
}

function cgptApplySharedButtonSize(button, size = "sm") {
  if (!button || !button.style) return;
  cgptApplySharedButtonStyle(button, {
    variant: button.dataset.cgptButtonVariant || "secondary",
    size,
  });
}

function cgptSetSharedButtonDisabled(button, disabled) {
  if (!button) return;
  button.disabled = Boolean(disabled);
  cgptRenderSharedButton(button);
}

function cgptSetSharedButtonCustomPalette(button, palette) {
  if (!button) return;
  button.__cgptSharedButtonCustomPalette = palette || null;
  cgptRenderSharedButton(button);
}
