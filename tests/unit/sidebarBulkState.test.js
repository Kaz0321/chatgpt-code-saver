const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/sidebarBulkState.js")];
  return require("../../extension/content/sidebarBulkState.js");
}

test("cgptFilterSidebarConversations excludes project items and matches titles case-insensitively", () => {
  const { cgptFilterSidebarConversations } = loadModule();
  const conversations = [
    { id: "a", title: "Alpha planning", isProjectItem: false },
    { id: "b", title: "Beta Migration", isProjectItem: false },
    { id: "c", title: "Project task", isProjectItem: true },
  ];

  assert.deepStrictEqual(
    cgptFilterSidebarConversations(conversations, "beta").map((item) => item.id),
    ["b"]
  );
  assert.deepStrictEqual(
    cgptFilterSidebarConversations(conversations, "").map((item) => item.id),
    ["a", "b"]
  );
});

test("cgptSummarizeSidebarSelection keeps hidden selections counted while excluding project items from eligible count", () => {
  const { cgptSummarizeSidebarSelection } = loadModule();
  const summary = cgptSummarizeSidebarSelection(
    [
      { id: "alpha", conversationId: "alpha", isProjectItem: false },
      { id: "beta", conversationId: "beta", isProjectItem: false },
      { id: "proj", conversationId: "proj", isProjectItem: true },
    ],
    new Set(["alpha", "beta", "proj"])
  );

  assert.deepStrictEqual(summary, {
    selectedCount: 3,
    eligibleSelectedCount: 2,
  });
});
