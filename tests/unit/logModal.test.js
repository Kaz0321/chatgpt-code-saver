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
    "Relative: chat-logs/demo/assistant.txt • Action: APPLY • Source: Chat Text • Role: assistant • Chat: demo-chat"
  );
});

test("getLogEntrySourceLabel maps known sources to readable labels", () => {
  const { getLogEntrySourceLabel } = loadModule();
  assert.equal(getLogEntrySourceLabel({ source: "chat-block" }), "Chat Code Block");
  assert.equal(getLogEntrySourceLabel({ source: "code-block" }), "Code Block");
});
