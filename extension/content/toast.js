function showToast(message, type = "info") {
  try {
    const existing = document.getElementById("cgpt-helper-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "cgpt-helper-toast";
    toast.textContent = message;

    toast.style.position = "fixed";
    toast.style.bottom = "24px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.zIndex = "10001";
    toast.style.padding = "8px 14px";
    toast.style.borderRadius = "999px";
    toast.style.fontSize = "12px";
    toast.style.color = "#fff";
    toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.2s ease";

    if (type === "error") {
      toast.style.background = "rgba(220, 53, 69, 0.95)";
    } else if (type === "success") {
      toast.style.background = "rgba(16, 163, 127, 0.95)";
    } else {
      toast.style.background = "rgba(32, 33, 35, 0.95)";
    }

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = "1";
    });

    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        toast.remove();
      }, 200);
    }, 2000);
  } catch (e) {
    console.warn("showToast error", e);
  }
}
