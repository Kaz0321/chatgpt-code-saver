function openLogViewer() {
  if (document.getElementById("cgpt-helper-log-modal")) return;

  chrome.runtime.sendMessage({ type: "getLogs" }, (res) => {
    if (!res || !res.ok) {
      showToast("ログの取得に失敗しました。", "error");
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

    const clearBtn = document.createElement("button");
    clearBtn.textContent = "Clear Logs";
    clearBtn.style.fontSize = "11px";
    clearBtn.style.padding = "4px 8px";
    clearBtn.style.borderRadius = "4px";
    clearBtn.style.border = "1px solid rgba(255,255,255,0.3)";
    clearBtn.style.cursor = "pointer";
    if (typeof cgptApplySharedButtonVariant === "function") {
      cgptApplySharedButtonVariant(clearBtn, "warning");
    } else {
      clearBtn.style.background = "#b00020";
      clearBtn.style.color = "#fff";
    }
    clearBtn.addEventListener("click", () => {
      if (!confirm("Clear all logs?")) return;
      chrome.runtime.sendMessage({ type: "clearLogs" }, (res2) => {
        if (!res2 || !res2.ok) {
          showToast("ログの削除に失敗しました。", "error");
          return;
        }
        list.innerHTML = "";
        list.appendChild(document.createTextNode("No logs yet."));
        showToast("ログを削除しました。", "success");
      });
    });
    headerButtons.appendChild(clearBtn);

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Close";
    closeBtn.style.fontSize = "11px";
    closeBtn.style.padding = "4px 8px";
    closeBtn.style.borderRadius = "4px";
    closeBtn.style.border = "1px solid rgba(255,255,255,0.3)";
    closeBtn.style.cursor = "pointer";
    if (typeof cgptApplySharedButtonVariant === "function") {
      cgptApplySharedButtonVariant(closeBtn, "muted");
    } else {
      closeBtn.style.background = "#444";
      closeBtn.style.color = "#fff";
    }
    closeBtn.addEventListener("click", () => {
      document.body.removeChild(overlay);
    });
    headerButtons.appendChild(closeBtn);

    headerRow.appendChild(headerButtons);
    dialog.appendChild(headerRow);

    const list = document.createElement("div");
    list.style.flex = "1";
    list.style.overflow = "auto";
    list.style.fontFamily = "monospace";
    list.style.fontSize = "11px";
    list.style.border = "1px solid #444";
    list.style.borderRadius = "4px";
    list.style.padding = "6px";
    list.style.background = "#18181b";
    list.style.whiteSpace = "pre-wrap";

    if (logs.length === 0) {
      list.textContent = "No logs yet.";
    } else {
      logs.forEach((entry) => {
        const line = document.createElement("div");
        line.style.display = "flex";
        line.style.alignItems = "center";
        line.style.gap = "8px";

        const info = document.createElement("div");
        info.style.flex = "1";

        const time = entry.time || "";
        const d = time ? new Date(time) : null;
        const timeStr = d && !isNaN(d.getTime()) ? d.toLocaleString() : time;

        const ok = entry.ok;
        const kind = entry.kind || "apply";
        const relativePath = entry.filePathRelative || "";
        const fallbackPath = entry.filePath || "";
        let absolutePath = entry.filePathAbsolute || fallbackPath || "";
        let pathLabel = "";
        if (relativePath && absolutePath) {
          pathLabel = `相対: ${relativePath} | 絶対: ${absolutePath}`;
        } else if (relativePath) {
          pathLabel = `相対: ${relativePath}`;
        } else if (absolutePath) {
          pathLabel = `絶対: ${absolutePath}`;
        } else if (fallbackPath) {
          pathLabel = fallbackPath;
        }
        const error = entry.error || "";

        const statusLabel = ok ? "[OK]" : "[ERROR]";

        info.textContent = `${timeStr} ${statusLabel} (${kind}) ${pathLabel}${
          error ? " - " + error : ""
        }`;
        info.style.color = ok ? "#a7f3d0" : "#fecaca";
        line.appendChild(info);

        if (ok && typeof entry.downloadId === "number") {
          const openBtn = document.createElement("button");
          openBtn.textContent = "Open";
          openBtn.style.fontSize = "10px";
          openBtn.style.padding = "2px 6px";
          openBtn.style.borderRadius = "4px";
          openBtn.style.border = "1px solid rgba(255,255,255,0.3)";
          openBtn.style.cursor = "pointer";
          if (typeof cgptApplySharedButtonVariant === "function") {
            cgptApplySharedButtonVariant(openBtn, "accent");
          } else {
            openBtn.style.background = "rgba(59,130,246,0.2)";
            openBtn.style.color = "#bfdbfe";
          }
          openBtn.addEventListener("click", () => {
            openBtn.disabled = true;
            chrome.runtime.sendMessage(
              { type: "openDownloadedFile", downloadId: entry.downloadId },
              (resOpen) => {
                openBtn.disabled = false;
                if (!resOpen || !resOpen.ok) {
                  const errMsg =
                    (resOpen && resOpen.error) || "ファイルを開けませんでした";
                  showToast(errMsg, "error");
                }
              }
            );
          });
          line.appendChild(openBtn);
        }

        list.appendChild(line);
      });
    }

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
