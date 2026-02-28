const CGPT_TEMPLATE_STORAGE_KEY = "cgptHelper.templates";

function cgptGetTemplates(callback) {
  chrome.storage.sync.get([CGPT_TEMPLATE_STORAGE_KEY], (res) => {
    callback(res[CGPT_TEMPLATE_STORAGE_KEY]);
  });
}

function cgptSetTemplates(templates, callback) {
  chrome.storage.sync.set({ [CGPT_TEMPLATE_STORAGE_KEY]: templates }, callback);
}
