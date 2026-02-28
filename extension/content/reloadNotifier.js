function checkAndNotifyReloaded() {
  try {
    chrome.storage.local.get(
      ["lastReloadedAt", "lastReloadedNotifiedAt"],
      (res) => {
        const lastReloadedAt = res.lastReloadedAt || null;
        const lastReloadedNotifiedAt = res.lastReloadedNotifiedAt || null;

        if (!lastReloadedAt || lastReloadedNotifiedAt === lastReloadedAt) {
          return;
        }

        let timeStr = lastReloadedAt;
        const d = new Date(lastReloadedAt);
        if (!isNaN(d.getTime())) {
          timeStr = d.toLocaleString();
        }

        showToast(`ChatGPT Helper reloaded (${timeStr})`, "success");

        chrome.storage.local.set({
          lastReloadedNotifiedAt: lastReloadedAt,
        });
      }
    );
  } catch (e) {
    console.warn("checkAndNotifyReloaded error", e);
  }
}
