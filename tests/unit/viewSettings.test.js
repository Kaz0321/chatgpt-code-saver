const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/viewSettings.js")];
  return require("../../extension/content/viewSettings.js");
}

function resetGlobals() {
  delete global.chrome;
  delete global.cgptCreateAsyncGuard;
  delete global.CGPT_ASYNC_FALLBACK_TIMEOUT_MS;
}

test("cgptLoadViewSettings falls back to defaults when storage sync is unavailable", async () => {
  const { cgptLoadViewSettings } = loadModule();

  await new Promise((resolve) => {
    cgptLoadViewSettings((settings) => {
      assert.deepStrictEqual(settings, { compactLineCount: 1 });
      resolve();
    });
  });

  resetGlobals();
});

test("cgptUpdateViewSettings persists normalized compact line counts", async () => {
  const { cgptUpdateViewSettings, cgptGetViewSettings } = loadModule();
  let storedPayload = null;
  global.chrome = {
    storage: {
      sync: {
        set(payload, callback) {
          storedPayload = payload;
          callback();
        },
      },
    },
  };

  await new Promise((resolve) => {
    cgptUpdateViewSettings({ compactLineCount: 5 }, (settings) => {
      assert.deepStrictEqual(settings, { compactLineCount: 5 });
      resolve();
    });
  });

  assert.deepStrictEqual(cgptGetViewSettings(), { compactLineCount: 5 });
  assert.deepStrictEqual(storedPayload, {
    cgptViewSettings: { compactLineCount: 5 },
  });
  resetGlobals();
});

test("cgptUpdateViewSettings rejects negative line counts and keeps defaults", async () => {
  const { cgptUpdateViewSettings } = loadModule();
  global.chrome = {
    storage: {
      sync: {
        set(_payload, callback) {
          callback();
        },
      },
    },
  };

  await new Promise((resolve) => {
    cgptUpdateViewSettings({ compactLineCount: -10 }, (settings) => {
      assert.deepStrictEqual(settings, { compactLineCount: 1 });
      resolve();
    });
  });

  resetGlobals();
});

test("cgptLoadViewSettings falls back when storage does not respond", async () => {
  const { cgptCreateAsyncGuard } = require("../../extension/content/state.js");
  global.cgptCreateAsyncGuard = cgptCreateAsyncGuard;
  global.CGPT_ASYNC_FALLBACK_TIMEOUT_MS = 20;
  global.chrome = {
    runtime: {
      lastError: null,
    },
    storage: {
      sync: {
        get() {
          // Simulate an extension API call that never resolves.
        },
      },
    },
  };
  const { cgptLoadViewSettings } = loadModule();

  await new Promise((resolve) => {
    cgptLoadViewSettings((settings) => {
      assert.deepStrictEqual(settings, { compactLineCount: 1 });
      resolve();
    });
  });

  resetGlobals();
});
