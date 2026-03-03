const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/chatLogModalActions.js")];
  return require("../../extension/content/chatLogModalActions.js");
}

function resetGlobals() {
  delete global.cgptTriggerChatLogDownload;
  delete global.showToast;
}

test("cgptDownloadCodeBlocksSequentially stops at the first failure", async () => {
  const { cgptDownloadCodeBlocksSequentially } = loadModule();
  const calls = [];
  const triggerDownload = (filePath, _content, options = {}) => {
    calls.push(filePath);
    if (filePath === "b.js") {
      options.onDone?.({ ok: false, filePath, error: "disk_full" });
      return;
    }
    options.onDone?.({ ok: true, filePath });
  };

  await assert.rejects(
    () =>
      cgptDownloadCodeBlocksSequentially([
        { filePath: "a.js", content: "a" },
        { filePath: "b.js", content: "b" },
        { filePath: "c.js", content: "c" },
      ], { triggerDownload }),
    (error) => {
      assert.equal(error.message, "disk_full");
      assert.deepStrictEqual(error.results, [
        { ok: true, filePath: "a.js" },
        { ok: false, filePath: "b.js", error: "disk_full" },
      ]);
      return true;
    }
  );

  assert.deepStrictEqual(calls, ["a.js", "b.js"]);
  resetGlobals();
});

test("cgptShowBatchSaveSummary reports stopped batch saves as errors", () => {
  const { cgptShowBatchSaveSummary } = loadModule();
  const toasts = [];
  global.showToast = (message, tone) => {
    toasts.push({ message, tone });
  };

  cgptShowBatchSaveSummary([
    { ok: true, filePath: "a.js" },
    { ok: false, filePath: "b.js", error: "disk_full" },
  ]);

  assert.deepStrictEqual(toasts, [
    {
      message: "Stopped after saving 1/2 code blocks. First error: disk_full",
      tone: "error",
    },
  ]);
  resetGlobals();
});
