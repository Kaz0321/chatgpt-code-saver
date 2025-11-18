const test = require('node:test');
const assert = require('node:assert/strict');

function loadModule() {
  delete require.cache[require.resolve('../content/saveOptions.js')];
  return require('../content/saveOptions.js');
}

test('cgptMergeSaveOptions ignores invalid input and preserves defaults', () => {
  const { cgptMergeSaveOptions, cgptGetSaveOptions, DEFAULT_SAVE_OPTIONS } = loadModule();
  cgptMergeSaveOptions(null);
  assert.deepStrictEqual(cgptGetSaveOptions(), DEFAULT_SAVE_OPTIONS);
});

test('cgptLoadSaveOptions falls back to defaults when chrome.storage.sync is unavailable', async () => {
  delete global.chrome;
  const { cgptLoadSaveOptions, DEFAULT_SAVE_OPTIONS } = loadModule();
  await new Promise((resolve) => {
    cgptLoadSaveOptions((options) => {
      assert.deepStrictEqual(options, DEFAULT_SAVE_OPTIONS);
      resolve();
    });
  });
});

test('cgptLoadSaveOptions merges values retrieved from chrome.storage.sync', async () => {
  global.chrome = {
    storage: {
      sync: {
        get(keys, callback) {
          assert.deepStrictEqual(keys, ['cgptSaveOptions']);
          callback({ cgptSaveOptions: { stripFirstLineMetadata: true } });
        },
      },
    },
  };
  const { cgptLoadSaveOptions } = loadModule();
  await new Promise((resolve) => {
    cgptLoadSaveOptions((options) => {
      assert.deepStrictEqual(options, { stripFirstLineMetadata: true });
      resolve();
    });
  });
  delete global.chrome;
});

test('cgptUpdateSaveOptions writes to chrome.storage.sync when available', async () => {
  let capturedPayload = null;
  global.chrome = {
    storage: {
      sync: {
        set(payload, callback) {
          capturedPayload = payload;
          callback();
        },
      },
    },
  };
  const { cgptUpdateSaveOptions } = loadModule();
  await new Promise((resolve) => {
    cgptUpdateSaveOptions({ stripFirstLineMetadata: true }, (options) => {
      assert.deepStrictEqual(options, { stripFirstLineMetadata: true });
      resolve();
    });
  });
  assert.deepStrictEqual(capturedPayload, {
    cgptSaveOptions: { stripFirstLineMetadata: true },
  });
  delete global.chrome;
});

test('cgptUpdateSaveOptions immediately invokes callback when storage sync is absent', async () => {
  delete global.chrome;
  const { cgptUpdateSaveOptions, DEFAULT_SAVE_OPTIONS } = loadModule();
  await new Promise((resolve) => {
    cgptUpdateSaveOptions({}, (options) => {
      assert.deepStrictEqual(options, DEFAULT_SAVE_OPTIONS);
      resolve();
    });
  });
});
