const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CGPT_FILE_PATH_ERROR_MESSAGES,
  cgptValidateFilePath,
} = require('../shared/filePathValidation.js');

test('cgptValidateFilePath rejects non-string input', () => {
  const result = cgptValidateFilePath();
  assert.deepStrictEqual(result, {
    ok: false,
    error: CGPT_FILE_PATH_ERROR_MESSAGES.missing,
  });
});

test('cgptValidateFilePath rejects blank strings', () => {
  const result = cgptValidateFilePath('   \t');
  assert.deepStrictEqual(result, {
    ok: false,
    error: CGPT_FILE_PATH_ERROR_MESSAGES.empty,
  });
});

test('cgptValidateFilePath rejects leading slashes', () => {
  const result = cgptValidateFilePath('/foo');
  assert.deepStrictEqual(result, {
    ok: false,
    error: CGPT_FILE_PATH_ERROR_MESSAGES.leadingSlash,
  });
});

test('cgptValidateFilePath rejects invalid characters and traversal', () => {
  const invalidCharResult = cgptValidateFilePath('foo|bar.js');
  assert.deepStrictEqual(invalidCharResult, {
    ok: false,
    error: CGPT_FILE_PATH_ERROR_MESSAGES.invalidChar,
  });

  const traversalResult = cgptValidateFilePath('src/../secret.js');
  assert.deepStrictEqual(traversalResult, {
    ok: false,
    error: CGPT_FILE_PATH_ERROR_MESSAGES.parentTraversal,
  });
});

test('cgptValidateFilePath trims whitespace for valid paths', () => {
  const result = cgptValidateFilePath('  src/utils/app.js  ');
  assert.deepStrictEqual(result, {
    ok: true,
    filePath: 'src/utils/app.js',
  });
});
