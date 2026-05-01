const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/sidebarApiDataSource.js")];
  return require("../../extension/content/sidebarApiDataSource.js");
}

function installWindowStub() {
  global.window = {
    location: {
      origin: "https://chatgpt.com",
      href: "https://chatgpt.com/c/current-chat",
    },
  };
}

function cleanupWindowStub() {
  delete global.window;
  delete global.fetch;
}

test("cgptNormalizeSidebarApiProject and cgptNormalizeSidebarApiConversation normalize API records", () => {
  installWindowStub();
  try {
    const {
      cgptNormalizeSidebarApiConversation,
      cgptNormalizeSidebarApiProject,
    } = loadModule();
    const project = cgptNormalizeSidebarApiProject({
      id: "proj-1",
      name: "Project Alpha",
    });
    assert.equal(project.id, "proj-1");
    assert.equal(project.name, "Project Alpha");

    const conversation = cgptNormalizeSidebarApiConversation(
      {
        id: "chat-1",
        title: "Roadmap",
        project_id: "proj-1",
      },
      new Map([["proj-1", project]])
    );
    assert.equal(conversation.conversationId, "chat-1");
    assert.equal(conversation.projectName, "Project Alpha");
    assert.equal(conversation.isProjectItem, true);
  } finally {
    cleanupWindowStub();
  }
});

test("cgptNormalizeSidebarApiProject unwraps snorlax sidebar gizmo wrappers", () => {
  installWindowStub();
  try {
    const { cgptNormalizeSidebarApiProject } = loadModule();
    const project = cgptNormalizeSidebarApiProject({
      gizmo: {
        id: "gizmo-1",
        displayName: "Hidden Project",
      },
      conversations: [],
    });
    assert.equal(project.id, "gizmo-1");
    assert.equal(project.name, "Hidden Project");
  } finally {
    cleanupWindowStub();
  }
});

test("cgptFetchSidebarApiSnapshot returns a normalized API snapshot", async () => {
  installWindowStub();
  try {
    const responses = new Map([
      [
        "https://chatgpt.com/api/auth/session",
        { ok: true, status: 200, body: { accessToken: "token-1" } },
      ],
      [
        "https://chatgpt.com/backend-api/projects?limit=100&offset=0",
        {
          ok: true,
          status: 200,
          body: {
            items: [{ id: "proj-1", name: "Project Alpha" }],
            has_more: false,
          },
        },
      ],
      [
        "https://chatgpt.com/backend-api/conversations?offset=0&limit=100&order=updated",
        {
          ok: true,
          status: 200,
          body: {
            items: [{ id: "chat-1", title: "Roadmap", project_id: "proj-1" }],
            has_more: false,
          },
        },
      ],
    ]);
    global.fetch = async (url) => {
      const hit = responses.get(String(url));
      if (!hit) {
        return {
          ok: false,
          status: 404,
          async json() {
            return { error: "not found" };
          },
        };
      }
      return {
        ok: hit.ok,
        status: hit.status,
        async json() {
          return hit.body;
        },
      };
    };
    const { cgptFetchSidebarApiSnapshot } = loadModule();
    const result = await cgptFetchSidebarApiSnapshot();
    assert.equal(result.ok, true);
    assert.equal(result.snapshot.source, "internal_api");
    assert.equal(result.snapshot.projects.length, 1);
    assert.equal(result.snapshot.conversations.length, 1);
    assert.equal(result.snapshot.conversations[0].projectName, "Project Alpha");
  } finally {
    cleanupWindowStub();
  }
});

test("cgptFetchSidebarApiSnapshot enriches slug-like project names from project detail endpoints", async () => {
  installWindowStub();
  try {
    const responses = new Map([
      [
        "https://chatgpt.com/api/auth/session",
        { ok: true, status: 200, body: { accessToken: "token-1" } },
      ],
      [
        "https://chatgpt.com/backend-api/gizmos/snorlax/sidebar?conversations_per_gizmo=5",
        {
          ok: true,
          status: 200,
          body: [
            {
              gizmo: {
                id: "gizmo-1",
                displayName: "g-p-69391d8aa50c8191a08b1059db926432-surface-pro",
              },
            },
          ],
        },
      ],
      [
        "https://chatgpt.com/backend-api/gizmos/gizmo-1",
        {
          ok: true,
          status: 200,
          body: {
            id: "gizmo-1",
            displayName: "Surface Pro",
          },
        },
      ],
      [
        "https://chatgpt.com/backend-api/conversations?offset=0&limit=100&order=updated",
        {
          ok: true,
          status: 200,
          body: {
            items: [{ id: "chat-1", title: "Roadmap", project_id: "gizmo-1" }],
            has_more: false,
          },
        },
      ],
    ]);
    global.fetch = async (url) => {
      const hit = responses.get(String(url));
      if (!hit) {
        return {
          ok: false,
          status: 404,
          async json() {
            return { error: "not found" };
          },
        };
      }
      return {
        ok: hit.ok,
        status: hit.status,
        async json() {
          return hit.body;
        },
      };
    };
    const { cgptFetchSidebarApiSnapshot } = loadModule();
    const result = await cgptFetchSidebarApiSnapshot();
    assert.equal(result.ok, true);
    assert.equal(result.snapshot.projects[0].name, "Surface Pro");
    assert.equal(result.snapshot.conversations[0].projectName, "Surface Pro");
  } finally {
    cleanupWindowStub();
  }
});

test("cgptFetchSidebarApiSnapshot hard-fails when endpoints do not match", async () => {
  installWindowStub();
  try {
    global.fetch = async () => ({
      ok: false,
      status: 404,
      async json() {
        return { error: "missing" };
      },
    });
    const { cgptFetchSidebarApiSnapshot } = loadModule();
    const result = await cgptFetchSidebarApiSnapshot();
    assert.equal(result.ok, false);
    assert.equal(result.diagnostics.message, "api_projects_fetch_failed");
  } finally {
    cleanupWindowStub();
  }
});
