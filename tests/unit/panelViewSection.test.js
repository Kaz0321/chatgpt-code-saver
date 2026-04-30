const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/panelViewSection.js")];
  return require("../../extension/content/panelViewSection.js");
}

function resetGlobals() {
  delete global.cgptReapplyCodeSaverDecorations;
  delete global.decorateCodeBlocks;
  delete global.showToast;
  delete global.document;
}

test("requestCodeSaverReapply rebuilds code block decorations and reports success", () => {
  const calls = [];
  global.document = { body: {} };
  global.cgptReapplyCodeSaverDecorations = (root) => {
    calls.push({ type: "reapply", root });
  };
  global.showToast = (message, tone) => {
    calls.push({ type: "toast", message, tone });
  };

  const { requestCodeSaverReapply } = loadModule();
  requestCodeSaverReapply();

  assert.deepStrictEqual(calls, [
    { type: "reapply", root: global.document },
    { type: "toast", message: "Reapplied code block decorations.", tone: "success" },
  ]);
  resetGlobals();
});
