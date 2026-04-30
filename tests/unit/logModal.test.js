const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/logModal.js")];
  return require("../../extension/content/logModal.js");
}

test("buildLogEntryMetaInfo includes source, role, and chat metadata", () => {
  const { buildLogEntryMetaInfo } = loadModule();

  const text = buildLogEntryMetaInfo({
    filePathRelative: "chat-logs/demo/assistant.txt",
    kind: "apply",
    source: "chat-entry",
    entryRole: "assistant",
    conversationKey: "demo-chat",
  });

  assert.equal(
    text,
    "Relative: chat-logs/demo/assistant.txt - Action: APPLY - Source: Chat Text - Role: assistant - Chat: demo-chat"
  );
});

test("getLogEntrySourceLabel maps known sources to readable labels", () => {
  const { getLogEntrySourceLabel } = loadModule();
  assert.equal(getLogEntrySourceLabel({ source: "chat-block" }), "Chat Code Block");
  assert.equal(getLogEntrySourceLabel({ source: "code-block" }), "Code Block");
});

test("resolveLogEntryDisplayTime prefers the source timestamp for historical chat saves", () => {
  const { resolveLogEntryDisplayTime } = loadModule();
  assert.equal(
    resolveLogEntryDisplayTime({
      time: "2026-03-11T01:02:03.000Z",
      sourceTimestamp: "2026-03-01T12:00:00.000Z",
    }),
    "2026-03-01T12:00:00.000Z"
  );
});
