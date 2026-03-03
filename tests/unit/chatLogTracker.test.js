const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/chatLogTracker.js")];
  return require("../../extension/content/chatLogTracker.js");
}

function resetGlobals() {
  delete global.getConversationKey;
}

test("cgptBuildResponseFilePath stores chat text under chat-logs with a sanitized conversation key", () => {
  global.getConversationKey = () => "Project: Alpha/Review";
  const { cgptBuildResponseFilePath } = loadModule();

  const filePath = cgptBuildResponseFilePath({
    role: "assistant",
    timestamp: "2026-03-03T10:20:30.456Z",
  });

  assert.equal(
    filePath,
    "chat-logs/Project-Alpha-Review/assistant-2026-03-03T10-20-30-456Z.txt"
  );
  resetGlobals();
});

test("cgptSanitizeChatLogPathSegment falls back for empty values", () => {
  const { cgptSanitizeChatLogPathSegment } = loadModule();
  assert.equal(cgptSanitizeChatLogPathSegment("..."), "current-chat");
  resetGlobals();
});
