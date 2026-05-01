const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/sidebarApiDiagnostics.js")];
  return require("../../extension/content/sidebarApiDiagnostics.js");
}

test("sidebar api diagnostics stores and clears normalized values", () => {
  const {
    cgptClearSidebarApiDiagnostics,
    cgptGetSidebarApiDiagnostics,
    cgptSetSidebarApiDiagnostics,
  } = loadModule();

  cgptSetSidebarApiDiagnostics({
    phase: "projects_fetch",
    authMode: "bearer",
    status: 403,
    endpoint: "https://chatgpt.com/backend-api/projects",
    message: "api_auth_failed",
    endpointTried: [
      { url: "https://chatgpt.com/backend-api/projects", status: 403, ok: false, shapeMatched: false },
    ],
  });
  const diagnostics = cgptGetSidebarApiDiagnostics();
  assert.equal(diagnostics.phase, "projects_fetch");
  assert.equal(diagnostics.status, 403);
  assert.equal(diagnostics.endpointTried.length, 1);

  cgptClearSidebarApiDiagnostics();
  assert.equal(cgptGetSidebarApiDiagnostics(), null);
});

test("cgptCopySidebarApiDebugJson writes formatted JSON to the clipboard", async () => {
  const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      clipboard: {
        written: "",
        async writeText(value) {
          this.written = value;
        },
      },
    },
  });

  try {
    const { cgptCopySidebarApiDebugJson } = loadModule();
    const ok = await cgptCopySidebarApiDebugJson({
      phase: "projects_fetch",
      status: 200,
    });
    assert.equal(ok, true);
    assert.match(global.navigator.clipboard.written, /"phase": "projects_fetch"/);
    assert.match(global.navigator.clipboard.written, /"status": 200/);
  } finally {
    if (originalNavigatorDescriptor) {
      Object.defineProperty(globalThis, "navigator", originalNavigatorDescriptor);
    } else {
      delete globalThis.navigator;
    }
  }
});
