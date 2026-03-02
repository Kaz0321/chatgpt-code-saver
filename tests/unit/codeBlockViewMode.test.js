const test = require('node:test');
const assert = require('node:assert/strict');

const { cgptCalculateCompactHeight } = require('../../extension/content/codeBlockViewMode.js');

test('cgptCalculateCompactHeight enforces overlay offset as the minimum height', () => {
  const overlayOffset = 38; // derived from button height, top offset, and margin
  const height = cgptCalculateCompactHeight(0, 22, overlayOffset);
  assert.strictEqual(height, overlayOffset);
});

test('cgptCalculateCompactHeight matches ChatGPT code block pixels for 6 lines', () => {
  const chatgptLineHeightPx = 22.4; // 0.875rem font-size with 1.6 line-height
  const overlayOffsetPx = 40; // ~24px button height + 8px top offset + margin
  const sixLineHeight = cgptCalculateCompactHeight(6, chatgptLineHeightPx, overlayOffsetPx);
  assert.strictEqual(sixLineHeight, chatgptLineHeightPx * 6);
});

test('cgptCalculateCompactHeight includes code block vertical padding when provided', () => {
  const lineHeightPx = 22.4;
  const overlayOffsetPx = 40;
  const verticalPaddingPx = 36; // 18px top + 18px bottom in the offline fixture
  const compactHeight = cgptCalculateCompactHeight(6, lineHeightPx, overlayOffsetPx, verticalPaddingPx);
  assert.strictEqual(compactHeight, lineHeightPx * 6 + verticalPaddingPx);
});

test('cgptCalculateCompactHeight ignores negative inputs', () => {
  const height = cgptCalculateCompactHeight(-3, -10, -5);
  assert.strictEqual(height, 0);
});
