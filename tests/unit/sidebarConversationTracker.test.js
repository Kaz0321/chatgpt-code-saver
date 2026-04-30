const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/sidebarConversationTracker.js")];
  return require("../../extension/content/sidebarConversationTracker.js");
}

function createAnchor({ href, title, projectItem = false, active = false }) {
  const row = {
    dataset: {
      cgptProjectItem: projectItem ? "1" : "0",
      cgptConversationActive: active ? "1" : "0",
      cgptProjectName: projectItem ? "Project Alpha" : "",
    },
    querySelector: () => null,
    closest: (selector) => {
      if (selector.includes("[data-cgpt-project-name]") && projectItem) {
        return { dataset: { cgptProjectName: "Project Alpha" } };
      }
      return null;
    },
  };
  const anchor = {
    dataset: {
      cgptConversationTitle: title,
      cgptProjectItem: projectItem ? "1" : "0",
    },
    getAttribute: (name) => {
      if (name === "href") return href;
      if (name === "aria-current") return active ? "page" : "";
      return "";
    },
    textContent: title,
    closest: () => row,
  };
  return anchor;
}

test("cgptExtractConversationIdFromHref parses ChatGPT conversation URLs", () => {
  const { cgptExtractConversationIdFromHref } = loadModule();
  assert.equal(cgptExtractConversationIdFromHref("/c/alpha-123?model=gpt"), "alpha-123");
});

test("cgptCollectSidebarConversations marks project items based on row metadata", () => {
  const { cgptCollectSidebarConversations } = loadModule();
  const anchors = [
    createAnchor({ href: "/c/alpha", title: "Alpha planning" }),
    createAnchor({ href: "/c/proj-task", title: "Project task", projectItem: true }),
  ];
  const root = {
    querySelector: (selector) => (selector === "[data-cgpt-sidebar-root='1']" ? root : null),
    querySelectorAll: (selector) => (selector === "a[href*='/c/']" ? anchors : []),
  };

  const result = cgptCollectSidebarConversations(root);
  assert.equal(result.length, 2);
  assert.equal(result[0].conversationId, "alpha");
  assert.equal(result[1].isProjectItem, true);
  assert.equal(result[1].projectName, "Project Alpha");
});
