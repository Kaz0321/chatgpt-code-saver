const test = require("node:test");
const assert = require("node:assert/strict");

function createClassList() {
  const values = new Set();
  return {
    add(name) {
      values.add(name);
    },
    remove(name) {
      values.delete(name);
    },
    contains(name) {
      return values.has(name);
    },
  };
}

function createDocumentMock() {
  const appendedNodes = [];
  const body = { classList: createClassList() };
  const documentElement = { classList: createClassList() };

  return {
    appendedNodes,
    body,
    documentElement,
    head: {
      appendChild(node) {
        appendedNodes.push(node);
      },
    },
    createElement(tagName) {
      return { tagName, textContent: "" };
    },
    querySelector(selector) {
      if (selector === 'button[aria-label*="停止"]') {
        return this.stopButton || null;
      }
      if (selector === 'button[aria-label*="Stop"]') {
        return this.stopButton || null;
      }
      return null;
    },
  };
}

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/lightweightMode.js")];
  return require("../../extension/content/lightweightMode.js");
}

function installModeGlobals() {
  global.CGPT_LIGHTWEIGHT_MODES = {
    NORMAL: "normal",
    AUTO: "auto",
    LIGHT: "light",
  };
  global.CGPT_DEFAULT_LIGHTWEIGHT_MODE = global.CGPT_LIGHTWEIGHT_MODES.AUTO;
}

function resetGlobals() {
  delete global.document;
  delete global.CGPT_LIGHTWEIGHT_MODES;
  delete global.CGPT_DEFAULT_LIGHTWEIGHT_MODE;
  delete global.cgptGetLightweightMode;
  delete global.setInterval;
  delete global.clearInterval;
}

test("cgptEnsureLightweightStyles injects selectors that target html and body", () => {
  installModeGlobals();
  global.document = createDocumentMock();
  const { cgptEnsureLightweightStyles } = loadModule();

  cgptEnsureLightweightStyles();

  assert.equal(global.document.appendedNodes.length, 1);
  const styleText = global.document.appendedNodes[0].textContent;
  assert.match(styleText, /html\.cgpt-lightweight pre code,/);
  assert.match(styleText, /html\.cgpt-lightweight,\s*body\.cgpt-lightweight \{/);
  resetGlobals();
});

test("cgptToggleLightweightMode updates both html and body classes", () => {
  installModeGlobals();
  global.document = createDocumentMock();
  const { cgptToggleLightweightMode, CGPT_LIGHTWEIGHT_CLASS } = loadModule();

  cgptToggleLightweightMode(true);
  assert.equal(global.document.documentElement.classList.contains(CGPT_LIGHTWEIGHT_CLASS), true);
  assert.equal(global.document.body.classList.contains(CGPT_LIGHTWEIGHT_CLASS), true);

  cgptToggleLightweightMode(false);
  assert.equal(global.document.documentElement.classList.contains(CGPT_LIGHTWEIGHT_CLASS), false);
  assert.equal(global.document.body.classList.contains(CGPT_LIGHTWEIGHT_CLASS), false);
  resetGlobals();
});

test("cgptApplyLightweightMode toggles classes correctly for light and normal", () => {
  installModeGlobals();
  global.document = createDocumentMock();
  const { cgptApplyLightweightMode, CGPT_LIGHTWEIGHT_CLASS } = loadModule();

  cgptApplyLightweightMode(global.CGPT_LIGHTWEIGHT_MODES.LIGHT);
  assert.equal(global.document.body.classList.contains(CGPT_LIGHTWEIGHT_CLASS), true);
  assert.equal(global.document.documentElement.classList.contains(CGPT_LIGHTWEIGHT_CLASS), true);

  cgptApplyLightweightMode(global.CGPT_LIGHTWEIGHT_MODES.NORMAL);
  assert.equal(global.document.body.classList.contains(CGPT_LIGHTWEIGHT_CLASS), false);
  assert.equal(global.document.documentElement.classList.contains(CGPT_LIGHTWEIGHT_CLASS), false);
  resetGlobals();
});

test("cgptApplyLightweightMode in auto mode follows generating state changes", () => {
  installModeGlobals();
  global.document = createDocumentMock();

  let intervalCallback = null;
  let clearedTimer = null;
  global.setInterval = (callback) => {
    intervalCallback = callback;
    return 77;
  };
  global.clearInterval = (timerId) => {
    clearedTimer = timerId;
  };

  const { cgptApplyLightweightMode, CGPT_LIGHTWEIGHT_CLASS } = loadModule();

  global.document.stopButton = { ariaLabel: "Stop generating" };
  cgptApplyLightweightMode(global.CGPT_LIGHTWEIGHT_MODES.AUTO);
  assert.equal(global.document.body.classList.contains(CGPT_LIGHTWEIGHT_CLASS), true);

  global.document.stopButton = null;
  intervalCallback();
  assert.equal(global.document.body.classList.contains(CGPT_LIGHTWEIGHT_CLASS), false);

  cgptApplyLightweightMode(global.CGPT_LIGHTWEIGHT_MODES.NORMAL);
  assert.equal(clearedTimer, 77);
  resetGlobals();
});
