function openLogViewer() {
  if (document.getElementById("cgpt-helper-log-modal")) return;

  chrome.runtime.sendMessage({ type: "getLogs" }, (res) => {
    if (!res || !res.ok) {
      showToast("Failed to load logs.", "error");
      return;
    }
    const logs = Array.isArray(res.logs) ? res.logs.slice().reverse() : [];

    const overlay = document.createElement("div");
    overlay.id = "cgpt-helper-log-modal";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0, 0, 0, 0.6)";
    overlay.style.zIndex = "10000";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";

    const dialog = document.createElement("div");
    dialog.style.background = "#202123";
    dialog.style.color = "#fff";
    dialog.style.borderRadius = "8px";
    dialog.style.padding = "12px";
    dialog.style.width = "80%";
    dialog.style.maxWidth = "800px";
    dialog.style.maxHeight = "80%";
    dialog.style.display = "flex";
    dialog.style.flexDirection = "column";
    dialog.style.gap = "8px";
    dialog.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5)";

    const headerRow = document.createElement("div");
    headerRow.style.display = "flex";
    headerRow.style.justifyContent = "space-between";
    headerRow.style.alignItems = "center";

    const title = document.createElement("div");
    title.textContent = "Save Log";
    title.style.fontWeight = "bold";
    headerRow.appendChild(title);

    const headerButtons = document.createElement("div");
    headerButtons.style.display = "flex";
    headerButtons.style.gap = "8px";

    const clearBtn = createLogModalButton("Clear Logs", "warning", "sm");
    clearBtn.addEventListener("click", () => {
      if (!confirm("Clear all logs?")) return;
      chrome.runtime.sendMessage({ type: "clearLogs" }, (res2) => {
        if (!res2 || !res2.ok) {
          showToast("Failed to clear logs.", "error");
          return;
        }
        renderLogEntries([]);
        showToast("Logs cleared.", "success");
      });
    });
    headerButtons.appendChild(clearBtn);

    const closeBtn = createLogModalButton("Close", "muted", "sm");
    closeBtn.addEventListener("click", () => {
      document.body.removeChild(overlay);
    });
    headerButtons.appendChild(closeBtn);

    headerRow.appendChild(headerButtons);
    dialog.appendChild(headerRow);

    const list = document.createElement("div");
    list.style.flex = "1";
    list.style.overflow = "auto";
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "12px";

    const renderLogEntries = (entries) => {
      list.innerHTML = "";
      if (!entries || entries.length === 0) {
        const empty = document.createElement("div");
        empty.textContent = "No logs yet.";
        empty.style.color = "#9ca3af";
        empty.style.textAlign = "center";
        list.appendChild(empty);
        return;
      }
      entries.forEach((entry) => {
        list.appendChild(createLogEntryCard(entry));
      });
    };

    renderLogEntries(logs);

    dialog.appendChild(list);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
  });
}

function createLogModalButton(label, variant = "secondary", size = "sm") {
  if (typeof createChatLogButton === "function") {
    return createChatLogButton(label, variant, size);
  }
  const button = document.createElement("button");
  button.textContent = label;
  button.style.fontSize = size === "sm" ? "11px" : "12px";
  button.style.padding = size === "sm" ? "2px 8px" : "4px 10px";
  button.style.borderRadius = "4px";
  button.style.border = "1px solid rgba(255,255,255,0.3)";
  button.style.cursor = "pointer";
  if (typeof cgptApplySharedButtonVariant === "function") {
    cgptApplySharedButtonVariant(button, variant);
  }
  return button;
}

function createLogEntryCard(entry) {
  const card = document.createElement("div");
  card.style.border = "1px solid #27272a";
  card.style.borderRadius = "8px";
  card.style.background = "#111827";
  card.style.padding = "10px";
  card.style.display = "flex";
  card.style.flexDirection = "column";
  card.style.gap = "8px";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.gap = "8px";

  const infoStack = document.createElement("div");
  infoStack.style.display = "flex";
  infoStack.style.flexDirection = "column";
  infoStack.style.gap = "2px";

  const timestamp = document.createElement("div");
  timestamp.textContent = formatLogTimestamp(entry && entry.time);
  timestamp.style.fontSize = "12px";
  timestamp.style.color = "#e5e7eb";
  infoStack.appendChild(timestamp);

  const status = document.createElement("div");
  const kind = (entry && entry.kind ? entry.kind : "apply").toUpperCase();
  const ok = Boolean(entry && entry.ok);
  status.textContent = `${kind} • ${ok ? "Success" : "Failed"}`;
  status.style.fontSize = "11px";
  status.style.color = ok ? "#6ee7b7" : "#fca5a5";
  infoStack.appendChild(status);

  header.appendChild(infoStack);

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "6px";
  const openBtn = createLogEntryOpenButton(entry);
  if (openBtn) {
    actions.appendChild(openBtn);
  }
  if (actions.childNodes.length > 0) {
    header.appendChild(actions);
  }

  card.appendChild(header);

  const codeBlock = document.createElement("pre");
  codeBlock.textContent = buildLogEntryCodeText(entry);
  codeBlock.style.margin = "0";
  codeBlock.style.fontFamily = "monospace";
  codeBlock.style.fontSize = "12px";
  codeBlock.style.background = "#0b1120";
  codeBlock.style.color = "#f3f4f6";
  codeBlock.style.padding = "8px";
  codeBlock.style.borderRadius = "6px";
  codeBlock.style.border = "1px solid #1f2937";
  codeBlock.style.whiteSpace = "pre-wrap";
  card.appendChild(codeBlock);

  return card;
}

function createLogEntryOpenButton(entry) {
  if (!entry || !entry.ok || typeof entry.downloadId !== "number") {
    return null;
  }
  const button = createLogModalButton("Open", "accent", "sm");
  button.addEventListener("click", () => {
    if (button.disabled) return;
    button.disabled = true;
    chrome.runtime.sendMessage(
      { type: "openDownloadedFile", downloadId: entry.downloadId },
      (resOpen) => {
        button.disabled = false;
        if (!resOpen || !resOpen.ok) {
          const errMsg = (resOpen && resOpen.error) || "Unable to open the file.";
          showToast(errMsg, "error");
        }
      }
    );
  });
  return button;
}

function buildLogEntryCodeText(entry) {
  const lines = [];
  const ok = Boolean(entry && entry.ok);
  lines.push(`// status: ${ok ? "success" : "error"}`);
  lines.push(`// action: ${(entry && entry.kind) || "apply"}`);
  if (entry && entry.error) {
    lines.push(`// error: ${entry.error}`);
  }
  if (entry && entry.filePathRelative) {
    lines.push(`// relative: ${entry.filePathRelative}`);
  }
  if (entry && entry.filePathAbsolute) {
    lines.push(`// absolute: ${entry.filePathAbsolute}`);
  } else if (entry && entry.filePath) {
    lines.push(`// path: ${entry.filePath}`);
  } else {
    lines.push("// path: (not provided)");
  }
  if (typeof (entry && entry.downloadId) === "number") {
    lines.push(`// downloadId: ${entry.downloadId}`);
  }
  return lines.join("\n");
}

function formatLogTimestamp(time) {
  if (!time) {
    return "Unknown time";
  }
  const d = new Date(time);
  if (!isNaN(d.getTime())) {
    return d.toLocaleString();
  }
  return String(time);
}
