const test = require('node:test');
const assert = require('node:assert/strict');

const {
  cgptGetRawCodeText,
  cgptParseCodeBlockMetadata,
  cgptGetNormalizedCodeText,
} = require('../../extension/content/codeBlockMetadata.js');

test('cgptParseCodeBlockMetadata extracts path and content from // metadata', () => {
  const code = {
    innerText: '\ufeff// file: src/app.js\r\nconsole.log("ok");',
  };
  const metadata = cgptParseCodeBlockMetadata(code);
  assert.deepStrictEqual(metadata, {
    filePath: 'src/app.js',
    content: 'console.log("ok");',
    metadataLine: '// file: src/app.js',
  });
});

test('cgptParseCodeBlockMetadata accepts # metadata prefix', () => {
  const code = {
    innerText: '# file: scripts/task.py\nprint("hello")',
  };
  const metadata = cgptParseCodeBlockMetadata(code);
  assert.deepStrictEqual(metadata, {
    filePath: 'scripts/task.py',
    content: 'print("hello")',
    metadataLine: '# file: scripts/task.py',
  });
});

test('cgptParseCodeBlockMetadata returns null when metadata is missing', () => {
  const metadata = cgptParseCodeBlockMetadata({ innerText: 'console.log("no meta");' });
  assert.strictEqual(metadata, null);
});

test('cgptParseCodeBlockMetadata ignores file: lines that are not first', () => {
  const metadata = cgptParseCodeBlockMetadata({ innerText: 'console.log("before");\n// file: src/late.js\nconsole.log("after");' });
  assert.strictEqual(metadata, null);
});

test('cgptGetNormalizedCodeText converts CRLF to LF', () => {
  const code = { innerText: 'line1\r\nline2' };
  assert.strictEqual(cgptGetNormalizedCodeText(code), 'line1\nline2');
});

test('cgptGetRawCodeText reads CodeMirror-style content containers', () => {
  const cmContent = {
    innerText: 'const answer = 42;\nconsole.log(answer);',
  };
  const pre = {
    matches: () => false,
    querySelector: (selector) => (selector === 'code, .cm-content' ? cmContent : null),
  };
  assert.strictEqual(
    cgptGetRawCodeText(pre),
    'const answer = 42;\nconsole.log(answer);'
  );
});

test('cgptParseCodeBlockMetadata supports CodeMirror-style content containers', () => {
  const cmContent = {
    innerText: '// file: src/cm.js\nconsole.log("cm");',
  };
  const pre = {
    matches: () => false,
    querySelector: (selector) => (selector === 'code, .cm-content' ? cmContent : null),
  };
  const metadata = cgptParseCodeBlockMetadata(pre);
  assert.deepStrictEqual(metadata, {
    filePath: 'src/cm.js',
    content: 'console.log("cm");',
    metadataLine: '// file: src/cm.js',
  });
});
