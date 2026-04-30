const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/panelVisibility.js")];
  return require("../../extension/content/panelVisibility.js");
}

function resetGlobals() {
  delete global.chrome;
  delete global.cgptInvokeExtensionApi;
  delete global.cgptIsExtensionContextInvalidatedError;
}

test("cgptUpdatePanelVisibility keeps working when storage set throws Extension context invalidated", async () => {
  const { cgptUpdatePanelVisibility, cgptGetPanelVisibility } = loadModule();
  global.cgptIsExtensionContextInvalidatedError = (error) =>
    /extension context invalidated/i.test(error && error.message ? error.message : "");
  let invoked = 0;
  global.chrome = {
    storage: {
      sync: {
        set() {
          invoked += 1;
          throw new Error("Extension context invalidated.");
        },
      },
    },
  };

  await new Promise((resolve) => {
    cgptUpdatePanelVisibility({ hidden: true }, (state) => {
      assert.deepStrictEqual(state, { hidden: true });
      resolve();
    });
  });

  assert.equal(invoked, 1);
  assert.deepStrictEqual(cgptGetPanelVisibility(), { hidden: true });
  resetGlobals();
});
