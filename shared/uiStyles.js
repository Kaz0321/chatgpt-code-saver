const CGPT_BUTTON_PALETTE = {
  primary: { background: "#2563eb", color: "#fff", border: "rgba(255,255,255,0.25)" },
  accent: { background: "#7c3aed", color: "#fff", border: "rgba(255,255,255,0.25)" },
  success: { background: "#10b981", color: "#fff", border: "rgba(255,255,255,0.25)" },
  secondary: { background: "#4b5563", color: "#f3f4f6", border: "rgba(255,255,255,0.2)" },
  muted: { background: "#374151", color: "#d1d5db", border: "rgba(255,255,255,0.15)" },
  warning: { background: "#f59e0b", color: "#111", border: "rgba(0,0,0,0.1)" },
};

function cgptGetButtonPaletteEntry(variant) {
  if (!variant) return CGPT_BUTTON_PALETTE.secondary;
  return CGPT_BUTTON_PALETTE[variant] || CGPT_BUTTON_PALETTE.secondary;
}

function cgptApplySharedButtonVariant(button, variant = "secondary") {
  if (!button || !button.style) return;
  const palette = cgptGetButtonPaletteEntry(variant);
  button.style.background = palette.background;
  button.style.color = palette.color;
  button.style.border = `1px solid ${palette.border}`;
}
