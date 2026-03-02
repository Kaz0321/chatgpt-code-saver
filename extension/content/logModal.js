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

    const clearBtn = createLogModalButton("Clear Logs", "danger", "sm");
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

    const closeBtn = createLogModalButton("Close", "secondary", "sm");
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
  if (typeof cgptCreateChatLogButton === "function") {
    return cgptCreateChatLogButton(label, variant, size);
  }
  const button =
    typeof cgptCreateSharedButton === "function"
      ? cgptCreateSharedButton(label, variant, size)
      : document.createElement("button");
  if (!button.textContent) {
    button.textContent = label;
  }
  if (typeof cgptCreateSharedButton !== "function") {
    button.style.fontSize = size === "sm" ? "11px" : "12px";
    button.style.padding = size === "sm" ? "0 8px" : "0 10px";
    button.style.minHeight = size === "sm" ? "28px" : "32px";
    button.style.borderRadius = "6px";
    button.style.border = "1px solid rgba(255,255,255,0.3)";
    button.style.cursor = "pointer";
    if (typeof cgptApplySharedButtonVariant === "function") {
      cgptApplySharedButtonVariant(button, variant);
    }
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
  header.style.flexWrap = "wrap";
  header.style.alignItems = "center";
  header.style.justifyContent = "flex-start";
  header.style.rowGap = "4px";
  header.style.columnGap = "12px";

  const timestamp = document.createElement("div");
  timestamp.textContent = formatLogTimestamp(entry && entry.time);
  timestamp.style.fontSize = "12px";
  timestamp.style.color = "#e5e7eb";
  timestamp.style.flex = "1";
  header.appendChild(timestamp);

  const status = document.createElement("div");
  const kind = (entry && entry.kind ? entry.kind : "apply").toUpperCase();
  const ok = Boolean(entry && entry.ok);
  status.textContent = `${kind} • ${ok ? "Success" : "Failed"}`;
  status.style.fontSize = "11px";
  status.style.fontWeight = "600";
  status.style.color = ok ? "#6ee7b7" : "#fca5a5";
  header.appendChild(status);

  const downloadInfo = document.createElement("div");
  downloadInfo.style.fontSize = "11px";
  downloadInfo.style.color = "#a5b4fc";
  downloadInfo.style.display = "flex";
  downloadInfo.style.flexWrap = "wrap";
  downloadInfo.style.gap = "4px";
  const downloadLabel = typeof (entry && entry.downloadId) === "number"
    ? `Download ID: ${entry.downloadId}`
    : "Download ID: N/A";
  const downloadFragments = [downloadLabel];
  if (!ok && entry && entry.error) {
    downloadFragments.push(`Error: ${entry.error}`);
  }
  downloadInfo.textContent = downloadFragments.join(" • ");
  header.appendChild(downloadInfo);

  card.appendChild(header);

  const fileRow = document.createElement("div");
  fileRow.style.display = "flex";
  fileRow.style.flexWrap = "wrap";
  fileRow.style.alignItems = "baseline";
  fileRow.style.columnGap = "8px";
  fileRow.style.rowGap = "4px";
  fileRow.style.paddingLeft = "8px";

  const fileNameText = document.createElement("span");
  fileNameText.textContent = getLogEntryFileName(entry);
  fileNameText.style.fontSize = "12px";
  fileNameText.style.fontWeight = "bold";
  fileNameText.style.color = "#facc15";
  fileRow.appendChild(fileNameText);

  const metaInfoText = document.createElement("span");
  metaInfoText.textContent = buildLogEntryMetaInfo(entry);
  metaInfoText.style.fontSize = "11px";
  metaInfoText.style.color = "#fef3c7";
  metaInfoText.style.opacity = "0.85";
  fileRow.appendChild(metaInfoText);

  card.appendChild(fileRow);

  const pathRow = document.createElement("div");
  pathRow.style.display = "flex";
  pathRow.style.flexWrap = "wrap";
  pathRow.style.alignItems = "center";
  pathRow.style.justifyContent = "space-between";
  pathRow.style.rowGap = "6px";
  pathRow.style.paddingLeft = "16px";

  const fullPathText = document.createElement("div");
  fullPathText.textContent = buildLogEntryFullPath(entry);
  fullPathText.style.fontFamily = "monospace";
  fullPathText.style.fontSize = "11px";
  fullPathText.style.color = "#d1d5db";
  fullPathText.style.wordBreak = "break-all";
  pathRow.appendChild(fullPathText);

  const openBtn = createLogEntryOpenButton(entry);
  if (openBtn) {
    pathRow.appendChild(openBtn);
  }

  card.appendChild(pathRow);

  return card;
}

function createLogEntryOpenButton(entry) {
  if (!entry || !entry.ok || typeof entry.downloadId !== "number") {
    return null;
  }
  const button = createLogModalButton("Open", "secondary", "sm");
  button.addEventListener("click", () => {
    if (button.disabled) return;
    if (typeof cgptSetSharedButtonDisabled === "function") {
      cgptSetSharedButtonDisabled(button, true);
    } else {
      button.disabled = true;
    }
    chrome.runtime.sendMessage(
      { type: "openDownloadedFile", downloadId: entry.downloadId },
      (resOpen) => {
        if (typeof cgptSetSharedButtonDisabled === "function") {
          cgptSetSharedButtonDisabled(button, false);
        } else {
          button.disabled = false;
        }
        if (!resOpen || !resOpen.ok) {
          const errMsg = (resOpen && resOpen.error) || "Unable to open the file.";
          showToast(errMsg, "error");
        }
      }
    );
  });
  return button;
}

function getLogEntryFileName(entry) {
  const pathCandidate =
    (entry && (entry.filePathRelative || entry.filePath || entry.filePathAbsolute)) || "";
  if (!pathCandidate) {
    return "Unknown file";
  }
  const normalized = pathCandidate.replace(/\\/g, "/");
  const segments = normalized.split("/").filter(Boolean);
  return segments.length ? segments[segments.length - 1] : normalized;
}

function buildLogEntryMetaInfo(entry) {
  const parts = [];
  if (entry && (entry.filePathRelative || entry.filePath)) {
    parts.push(`Relative: ${entry.filePathRelative || entry.filePath}`);
  }
  if (entry && entry.kind) {
    parts.push(`Action: ${String(entry.kind).toUpperCase()}`);
  }
  if (parts.length === 0) {
    return "No additional information.";
  }
  return parts.join(" • ");
}

function buildLogEntryFullPath(entry) {
  if (entry && entry.filePathAbsolute) {
    return `Full path: ${entry.filePathAbsolute}`;
  }
  if (entry && entry.filePath) {
    return `Full path: ${entry.filePath}`;
  }
  return "Full path: (not provided)";
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
