// file: chatgpt-code-apply-helper/background.js
// ChatGPT Code Apply Helper - background
// ・Apply to project（保存）
// ・テンプレート保存/取得
// ・保存ログ記録/取得/削除
// ・拡張自身のリロード検知（タイムスタンプ保存）

// 拡張Aがインストール／更新されたときにタイムスタンプを記録
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    chrome.storage.local.set({
      lastReloadedAt: new Date().toISOString(),
      lastReloadedNotifiedAt: null, // 通知状態はリセット
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  // ---- 共通ログ保存ロジック ----
  function appendLog(entry, cb) {
    try {
      chrome.storage.local.get(["cgptHelper.logs"], (res) => {
        let logs =
          res && Array.isArray(res["cgptHelper.logs"])
            ? res["cgptHelper.logs"]
            : [];
        logs.push(entry);
        // 古いものから削る（最大200件）
        if (logs.length > 200) {
          logs = logs.slice(logs.length - 200);
        }
        chrome.storage.local.set({ "cgptHelper.logs": logs }, () => {
          if (cb) cb();
        });
      });
    } catch (e) {
      console.error("appendLog error", e);
      if (cb) cb();
    }
  }

  // ---- コード保存（Apply to project） ----
  if (message.type === "applyCodeBlock") {
    const filePath = message.filePath;
    const content = message.content;
    if (!filePath || typeof content !== "string") {
      const errMsg = "invalid_params";
      appendLog({
        time: new Date().toISOString(),
        kind: "apply",
        ok: false,
        filePath: filePath || "",
        error: errMsg,
      });
      sendResponse({ ok: false, error: errMsg });
      return;
    }

    const encoded = encodeURIComponent(content);
    const url = "data:text/plain;charset=utf-8," + encoded;

    chrome.downloads.download(
      {
        url: url,
        // ★ここは「ダウンロードフォルダからの相対パス」が前提
        filename: filePath,
        conflictAction: "overwrite",
        saveAs: false,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          const err = chrome.runtime.lastError.message || "unknown error";
          console.error("downloads.download error:", chrome.runtime.lastError);

          appendLog(
            {
              time: new Date().toISOString(),
              kind: "apply",
              ok: false,
              filePath,
              error: err,
              downloadId: null,
            },
            () => {
              sendResponse({ ok: false, error: err });
            }
          );
        } else {
          console.log("Downloaded and overwrote:", filePath, "id:", downloadId);
          appendLog(
            {
              time: new Date().toISOString(),
              kind: "apply",
              ok: true,
              filePath,
              error: "",
              downloadId,
            },
            () => {
              sendResponse({ ok: true, downloadId: downloadId });
            }
          );
        }
      }
    );

    // 非同期応答を続行することを Chrome に伝える
    return true;
  }

  // ---- 拡張自身をリロード ----
  if (message.type === "reloadExtension") {
    chrome.runtime.reload();
    sendResponse({ ok: true });
    return;
  }

  // ---- テンプレ取得 ----
  if (message.type === "getTemplates") {
    chrome.storage.sync.get(["cgptHelper.templates"], (res) => {
      const templates = res["cgptHelper.templates"];
      sendResponse({ ok: true, templates });
    });
    return true;
  }

  // ---- テンプレ保存 ----
  if (message.type === "setTemplates") {
    const templates = message.templates || [];
    chrome.storage.sync.set({ "cgptHelper.templates": templates }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ ok: true });
      }
    });
    return true;
  }

  // ---- ログ取得 ----
  if (message.type === "getLogs") {
    chrome.storage.local.get(["cgptHelper.logs"], (res) => {
      const logs =
        res && Array.isArray(res["cgptHelper.logs"])
          ? res["cgptHelper.logs"]
          : [];
      sendResponse({ ok: true, logs });
    });
    return true;
  }

  // ---- ログ削除 ----
  if (message.type === "clearLogs") {
    chrome.storage.local.set({ "cgptHelper.logs": [] }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ ok: true });
      }
    });
    return true;
  }
});
