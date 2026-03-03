const test = require('node:test');
const assert = require('node:assert/strict');

function loadModule() {
  delete require.cache[require.resolve('../../extension/content/saveFlow.js')];
  return require('../../extension/content/saveFlow.js');
}

function installValidationMock() {
  const { cgptValidateFilePath } = require('../../extension/shared/filePathValidation.js');
  global.cgptValidateFilePath = cgptValidateFilePath;
}

function resetGlobals() {
  delete global.cgptValidateFilePath;
  delete global.showToast;
  delete global.cgptFlashButtonText;
  delete global.chrome;
}

test('cgptNormalizeSaveRequest separates request fields and validates targetPath', () => {
  installValidationMock();
  const { cgptNormalizeSaveRequest, CGPT_SAVE_MODES } = loadModule();
  const result = cgptNormalizeSaveRequest({
    content: 'console.log("ok");',
    targetPath: 'src/app.js',
    mode: CGPT_SAVE_MODES.SAVE_AS,
    meta: { source: 'code-block' },
    overrideFolderPath: 'C:/workspace',
  });
  assert.equal(result.ok, true);
  assert.deepStrictEqual(result.request, {
    content: 'console.log("ok");',
    targetPath: 'src/app.js',
    mode: 'saveAs',
    meta: { source: 'code-block' },
    overrideFolderPath: 'C:/workspace',
  });
  resetGlobals();
});

test('cgptRequestSave sends the normalized save payload to background', async () => {
  installValidationMock();
  const { cgptRequestSave, CGPT_SAVE_MODES } = loadModule();
  let capturedMessage = null;
  global.chrome = {
    runtime: {
      sendMessage(message, callback) {
        capturedMessage = message;
        callback({ ok: true, filePath: 'src/app.js' });
      },
    },
  };

  await new Promise((resolve) => {
    cgptRequestSave(
      {
        content: 'const x = 1;',
        targetPath: 'src/app.js',
        mode: CGPT_SAVE_MODES.SAVE,
        meta: {
          source: 'chat-entry',
          conversationKey: 'abc',
          entryRole: 'assistant',
          timestamp: '2026-03-03T00:00:00.000Z',
        },
      },
      (result) => {
        assert.deepStrictEqual(result, {
          ok: true,
          filePath: 'src/app.js',
          response: { ok: true, filePath: 'src/app.js' },
        });
        resolve();
      }
    );
  });

  assert.deepStrictEqual(capturedMessage, {
    type: 'applyCodeBlock',
    filePath: 'src/app.js',
    content: 'const x = 1;',
    saveAs: false,
    overrideFolderPath: '',
    source: 'chat-entry',
    conversationKey: 'abc',
    entryRole: 'assistant',
    timestamp: '2026-03-03T00:00:00.000Z',
  });
  resetGlobals();
});

test('cgptRunSaveAction reports save failures through unified UI handling', async () => {
  installValidationMock();
  const { cgptRunSaveAction, CGPT_SAVE_MODES } = loadModule();
  const toasts = [];
  global.showToast = (message, tone) => {
    toasts.push({ message, tone });
  };
  global.chrome = {
    runtime: {
      sendMessage(_message, callback) {
        callback({ ok: false, error: 'disk_full' });
      },
    },
  };

  await new Promise((resolve) => {
    cgptRunSaveAction(
      {
        request: {
          content: 'body',
          targetPath: 'logs/output.txt',
          mode: CGPT_SAVE_MODES.SAVE,
        },
      },
      (result) => {
        assert.deepStrictEqual(result, { ok: false, error: 'disk_full' });
        resolve();
      }
    );
  });

  assert.deepStrictEqual(toasts, [{ message: 'disk_full', tone: 'error' }]);
  resetGlobals();
});

test('cgptRunSaveAction flashes button text and success toast on save success', async () => {
  installValidationMock();
  const { cgptRunSaveAction, CGPT_SAVE_MODES } = loadModule();
  const toasts = [];
  const flashes = [];
  const button = { textContent: 'Save' };
  global.showToast = (message, tone) => {
    toasts.push({ message, tone });
  };
  global.cgptFlashButtonText = (target, text) => {
    flashes.push({ target, text });
  };
  global.chrome = {
    runtime: {
      sendMessage(_message, callback) {
        callback({ ok: true, filePath: 'chat/session-1/response.txt' });
      },
    },
  };

  await new Promise((resolve) => {
    cgptRunSaveAction(
      {
        request: {
          content: 'response body',
          targetPath: 'chat/session-1/response.txt',
          mode: CGPT_SAVE_MODES.SAVE,
        },
        ui: {
          triggerButton: button,
          flashButtonText: 'Saved',
        },
      },
      (result) => {
        assert.equal(result.ok, true);
        resolve();
      }
    );
  });

  assert.deepStrictEqual(flashes, [{ target: button, text: 'Saved' }]);
  assert.deepStrictEqual(toasts, [
    { message: 'Saved: chat/session-1/response.txt', tone: 'success' },
  ]);
  resetGlobals();
});
