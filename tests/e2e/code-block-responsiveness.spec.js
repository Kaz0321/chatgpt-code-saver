const fs = require("fs/promises");
const path = require("path");
const { test, expect } = require("@playwright/test");

const repoRoot = path.join(__dirname, "..", "..");
const artifactsRoot = path.join(__dirname, "..", "artifacts", "code-block-responsiveness");

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readScript(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), "utf8");
}

function buildFixtureHtml() {
  const codeBlocks = Array.from({ length: 20 }, (_, index) => {
    return `
      <pre>
        <div class="cgpt-mock-code-shell">
          <div class="cgpt-mock-code-header">
            <div class="cgpt-mock-code-label"><span>JavaScript</span></div>
            <div class="cgpt-mock-code-actions"><button aria-label="Copy"></button></div>
          </div>
          <div class="cgpt-mock-code-body">
            <code>// file: src/demo-${index}.js
export function demo${index}() {
  return ${index};
}
</code>
          </div>
        </div>
      </pre>
    `;
  }).join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Code Block Responsiveness</title>
    <style>
      body {
        margin: 0;
        font-family: sans-serif;
        background: #111827;
        color: #f9fafb;
      }
      main {
        max-width: 960px;
        margin: 0 auto;
        padding: 32px 24px 120px;
      }
      [data-message-author-role] {
        margin-bottom: 24px;
        padding: 20px;
        border-radius: 16px;
        background: #1f2937;
      }
      pre {
        position: relative;
        overflow: visible;
        padding: 0;
        margin: 16px 0;
        background: transparent;
      }
      .cgpt-mock-code-shell {
        border: 1px solid rgba(148, 163, 184, 0.35);
        border-radius: 20px;
        background: #0f172a;
        overflow: hidden;
      }
      .cgpt-mock-code-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 14px;
        background: rgba(15, 23, 42, 0.92);
        color: #e5eefb;
        font-size: 14px;
        font-weight: 600;
      }
      .cgpt-mock-code-label {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .cgpt-mock-code-body {
        padding: 18px 20px;
      }
      code {
        display: block;
        white-space: pre-wrap;
        font-family: "Courier New", monospace;
        line-height: 1.5;
      }
      #status {
        margin-bottom: 24px;
      }
    </style>
  </head>
  <body>
    <main>
      <div id="status">ready</div>
      <div data-message-author-role="assistant" data-message-id="assistant-stress-1">
        ${codeBlocks}
      </div>
      <textarea data-testid="chat-input"></textarea>
    </main>
  </body>
</html>`;
}

test("code block observer stays responsive under repeated mutations", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "This DOM-level verification targets Chromium behavior.");

  const screenshotDir = path.join(artifactsRoot, "screenshots");
  const stateDir = path.join(artifactsRoot, "state");
  await Promise.all([ensureDir(screenshotDir), ensureDir(stateDir)]);

  const scripts = await Promise.all([
    readScript("extension/shared/uiStyles.js"),
    readScript("extension/content/codeBlockMetadata.js"),
    readScript("extension/content/codeBlockViewMode.js"),
    readScript("extension/content/codeBlockButtons.js"),
    readScript("extension/content/codeBlocks.js"),
    readScript("extension/content/codeBlockObserver.js"),
  ]);

  await page.setContent(buildFixtureHtml(), { waitUntil: "domcontentloaded" });
  for (const script of scripts) {
    await page.addScriptTag({ content: script });
  }

  const result = await page.evaluate(async () => {
    decorateCodeBlocks(document);
    setupCodeBlockMutationObserver();

    const before = {
      wrappers: document.querySelectorAll("[data-cgpt-code-wrapper='1']").length,
      previews: document.querySelectorAll("[data-cgpt-code-preview='1']").length,
      paths: document.querySelectorAll("[data-cgpt-code-file-path='1']").length,
    };

    const status = document.getElementById("status");
    const start = performance.now();

    for (let i = 0; i < 200; i += 1) {
      status.textContent = `tick-${i}`;
      if (i % 10 === 0) {
        document.querySelectorAll("pre[data-cgpt-code-helper-applied='1']").forEach((pre) => {
          cgptSetPreViewMode(pre, i % 20 === 0 ? "expanded" : "compact");
        });
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    const durationMs = performance.now() - start;
    const after = {
      wrappers: document.querySelectorAll("[data-cgpt-code-wrapper='1']").length,
      previews: document.querySelectorAll("[data-cgpt-code-preview='1']").length,
      paths: document.querySelectorAll("[data-cgpt-code-file-path='1']").length,
      status: status.textContent,
    };

    return {
      durationMs,
      before,
      after,
    };
  });

  expect(result.before.wrappers).toBe(20);
  expect(result.after.wrappers).toBe(20);
  expect(result.before.previews).toBe(20);
  expect(result.after.previews).toBe(20);
  expect(result.after.paths).toBe(20);
  expect(result.after.status).toBe("tick-199");
  expect(result.durationMs).toBeLessThan(5000);

  await Promise.all([
    page.screenshot({
      path: path.join(screenshotDir, "code-block-responsiveness.png"),
      fullPage: true,
    }),
    fs.writeFile(
      path.join(stateDir, "responsiveness-result.json"),
      `${JSON.stringify(result, null, 2)}\n`,
      "utf8"
    ),
  ]);
});
