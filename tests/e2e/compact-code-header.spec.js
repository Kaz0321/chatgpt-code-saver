const fs = require("fs/promises");
const path = require("path");
const { test, expect } = require("@playwright/test");

const repoRoot = path.join(__dirname, "..", "..");
const artifactsRoot = path.join(__dirname, "..", "artifacts", "compact-code-header");

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readScript(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), "utf8");
}

function buildFixtureHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Compact Header Fixture</title>
    <style>
      body {
        margin: 0;
        font-family: sans-serif;
        background: #111827;
        color: #f9fafb;
      }
      main {
        max-width: 920px;
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
      .cgpt-mock-code-actions {
        display: flex;
        gap: 4px;
      }
      .cgpt-mock-code-actions button {
        width: 32px;
        height: 32px;
      }
      .cgpt-mock-code-body {
        padding: 18px 20px;
      }
      .cm-content,
      code {
        display: block;
        white-space: pre-wrap;
        font-family: "Courier New", monospace;
        line-height: 1.5;
      }
    </style>
  </head>
  <body>
    <main>
      <div data-message-author-role="assistant" data-message-id="assistant-compact-1">
        <p>Compact preview should keep native code labels and append file paths.</p>
        <pre>
          <div class="cgpt-mock-code-shell">
            <div class="cgpt-mock-code-header">
              <div class="cgpt-mock-code-label">
                <span>Python</span>
              </div>
              <div class="cgpt-mock-code-actions">
                <button aria-label="Copy"></button>
              </div>
            </div>
            <div class="cgpt-mock-code-body">
              <div class="cm-scroller">
                <div class="cm-content">// file: src/demo.py
def hello():
    print("hello")
    return 1
</div>
              </div>
            </div>
          </div>
        </pre>
        <pre>
          <div class="cgpt-mock-code-shell">
            <div class="cgpt-mock-code-header">
              <div class="cgpt-mock-code-label">
                <span>Code</span>
              </div>
              <div class="cgpt-mock-code-actions">
                <button aria-label="Copy"></button>
              </div>
            </div>
            <div class="cgpt-mock-code-body">
              <code># file: scripts/run.sh
echo "hello"
echo "world"
</code>
            </div>
          </div>
        </pre>
        <pre>
          <div class="cgpt-mock-code-shell">
            <div class="cgpt-mock-code-header">
              <div class="cgpt-mock-code-label">
                <div class="cgpt-mock-code-label-main">
                  <span data-lang-label="1">JavaScript</span>
                </div>
                <div class="cgpt-mock-code-label-summary">export function errorHandler(err, req, res, next) {</div>
              </div>
              <div class="cgpt-mock-code-actions">
                <button aria-label="Copy"></button>
              </div>
            </div>
            <div class="cgpt-mock-code-body">
              <code>// file: src/middleware/errorHandler.js
export function errorHandler(err, req, res, next) {
  return err;
}
</code>
            </div>
          </div>
        </pre>
      </div>
      <textarea data-testid="chat-input"></textarea>
    </main>
  </body>
</html>`;
}

test("compact mode keeps native labels and appends file paths", async ({ page, browserName }) => {
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
  ]);

  await page.setContent(buildFixtureHtml(), { waitUntil: "domcontentloaded" });
  for (const script of scripts) {
    await page.addScriptTag({ content: script });
  }

  const expected = [
    {
      headerText: "Python src/demo.py",
      pathText: "src/demo.py",
      langText: "",
      hasToggle: true,
      toggleExpanded: "false",
      toggleCount: 1,
      previewText: "def hello():",
      hostDisplay: "none",
    },
    {
      headerText: "Code scripts/run.sh",
      pathText: "scripts/run.sh",
      langText: "",
      hasToggle: true,
      toggleExpanded: "false",
      toggleCount: 1,
      previewText: 'echo "hello"',
      hostDisplay: "none",
    },
    {
      headerText: "JavaScript export function errorHandler(err, req, res, next) { src/middleware/errorHandler.js",
      pathText: "src/middleware/errorHandler.js",
      langText: "JavaScript",
      hasToggle: true,
      toggleExpanded: "false",
      toggleCount: 1,
      previewText: "export function errorHandler(err, req, res, next) {",
      hostDisplay: "none",
    },
  ];
  const result = await page.waitForFunction(() => {
    if (typeof decorateCodeBlocks === "function") {
      decorateCodeBlocks(document);
    }
    const pres = Array.from(document.querySelectorAll("pre[data-cgpt-code-helper-applied='1']"));
    if (pres.length !== 3) {
      return null;
    }
    return pres.map((pre) => {
      const pathEl = pre.querySelector("[data-cgpt-code-file-path='1']");
      const labelNode = pathEl ? pathEl.parentElement : null;
      const explicitLangNode = pre.querySelector("[data-lang-label='1']");
      const toggles = Array.from(pre.querySelectorAll("[data-cgpt-code-toggle='1']"));
      const toggle = toggles[0] || null;
      const preview = pre.parentElement?.querySelector(
        "[data-cgpt-code-preview='1'] [data-cgpt-code-preview-content='1']"
      );
      const host = typeof cgptGetCompactContentHost === "function"
        ? cgptGetCompactContentHost(pre)
        : pre;
      return {
        headerText: labelNode ? labelNode.textContent.replace(/\s+/g, " ").trim() : "",
        pathText: pathEl ? pathEl.textContent.trim() : "",
        langText: explicitLangNode ? explicitLangNode.textContent.replace(/\s+/g, " ").trim() : "",
        hasToggle: Boolean(toggle),
        toggleExpanded: toggle ? toggle.getAttribute("aria-expanded") : "",
        toggleCount: toggles.length,
        previewText: preview ? preview.textContent.trim().split("\n")[0] : "",
        hostDisplay: host && host.style ? host.style.display : "",
      };
    });
  }, null, { timeout: 10_000 }).then((handle) => handle.jsonValue());
  expect(result).toEqual(expected);

  await Promise.all([
    page.screenshot({
      path: path.join(screenshotDir, "compact-header-mock.png"),
      fullPage: true,
    }),
    fs.writeFile(
      path.join(stateDir, "compact-header-result.json"),
      `${JSON.stringify(result, null, 2)}\n`,
      "utf8"
    ),
  ]);
});

test("compact and expand can be repeated without breaking the header path", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "This DOM-level verification targets Chromium behavior.");

  const scripts = await Promise.all([
    readScript("extension/shared/uiStyles.js"),
    readScript("extension/content/codeBlockMetadata.js"),
    readScript("extension/content/codeBlockViewMode.js"),
    readScript("extension/content/codeBlockButtons.js"),
    readScript("extension/content/codeBlocks.js"),
  ]);

  await page.setContent(buildFixtureHtml(), { waitUntil: "domcontentloaded" });
  for (const script of scripts) {
    await page.addScriptTag({ content: script });
  }

  const result = await page.evaluate(() => {
    decorateCodeBlocks(document);
    const targetPre = document.querySelectorAll("pre[data-cgpt-code-helper-applied='1']")[2];
    const snapshot = () => {
      const pathNodes = Array.from(targetPre.querySelectorAll("[data-cgpt-code-file-path='1']"));
      const langNode = targetPre.querySelector("[data-lang-label='1']");
      const summaryNode = targetPre.querySelector(".cgpt-mock-code-label-summary");
      const toggleNodes = Array.from(targetPre.querySelectorAll("[data-cgpt-code-toggle='1']"));
      const toggleNode = toggleNodes[0] || null;
      return {
        pathCount: pathNodes.length,
        pathText: pathNodes.map((node) => node.textContent.trim()).join(" | "),
        langText: langNode ? langNode.textContent.replace(/\s+/g, " ").trim() : "",
        summaryText: summaryNode ? summaryNode.textContent.replace(/\s+/g, " ").trim() : "",
        toggleExpanded: toggleNode ? toggleNode.getAttribute("aria-expanded") : "",
        toggleCount: toggleNodes.length,
      };
    };

    const states = [snapshot()];
    for (let i = 0; i < 3; i += 1) {
      cgptSetPreViewMode(targetPre, CGPT_VIEW_MODE.EXPANDED);
      states.push(snapshot());
      cgptSetPreViewMode(targetPre, CGPT_VIEW_MODE.COMPACT);
      states.push(snapshot());
    }
    return states;
  });

  expect(result).toEqual([
    {
      pathCount: 1,
      pathText: "src/middleware/errorHandler.js",
      langText: "JavaScript",
      summaryText: "export function errorHandler(err, req, res, next) {",
      toggleExpanded: "false",
      toggleCount: 1,
    },
    {
      pathCount: 0,
      pathText: "",
      langText: "JavaScript",
      summaryText: "export function errorHandler(err, req, res, next) {",
      toggleExpanded: "true",
      toggleCount: 1,
    },
    {
      pathCount: 1,
      pathText: "src/middleware/errorHandler.js",
      langText: "JavaScript",
      summaryText: "export function errorHandler(err, req, res, next) {",
      toggleExpanded: "false",
      toggleCount: 1,
    },
    {
      pathCount: 0,
      pathText: "",
      langText: "JavaScript",
      summaryText: "export function errorHandler(err, req, res, next) {",
      toggleExpanded: "true",
      toggleCount: 1,
    },
    {
      pathCount: 1,
      pathText: "src/middleware/errorHandler.js",
      langText: "JavaScript",
      summaryText: "export function errorHandler(err, req, res, next) {",
      toggleExpanded: "false",
      toggleCount: 1,
    },
    {
      pathCount: 0,
      pathText: "",
      langText: "JavaScript",
      summaryText: "export function errorHandler(err, req, res, next) {",
      toggleExpanded: "true",
      toggleCount: 1,
    },
    {
      pathCount: 1,
      pathText: "src/middleware/errorHandler.js",
      langText: "JavaScript",
      summaryText: "export function errorHandler(err, req, res, next) {",
      toggleExpanded: "false",
      toggleCount: 1,
    },
  ]);
});

test("header toggle switches compact mode from the left edge control", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "This DOM-level verification targets Chromium behavior.");

  const scripts = await Promise.all([
    readScript("extension/shared/uiStyles.js"),
    readScript("extension/content/codeBlockMetadata.js"),
    readScript("extension/content/codeBlockViewMode.js"),
    readScript("extension/content/codeBlockButtons.js"),
    readScript("extension/content/codeBlocks.js"),
  ]);

  await page.setContent(buildFixtureHtml(), { waitUntil: "domcontentloaded" });
  for (const script of scripts) {
    await page.addScriptTag({ content: script });
  }

  const result = await page.evaluate(() => {
    decorateCodeBlocks(document);
    const targetPre = document.querySelectorAll("pre[data-cgpt-code-helper-applied='1']")[0];
    const host = typeof cgptGetCompactContentHost === "function"
      ? cgptGetCompactContentHost(targetPre)
      : targetPre;
    const preview = targetPre.parentElement?.querySelector("[data-cgpt-code-preview='1']");
    const snapshot = () => {
      const toggle = targetPre.querySelector("[data-cgpt-code-toggle='1']");
      return {
        viewMode: targetPre.dataset.cgptViewMode || "",
        toggleExpanded: toggle ? toggle.getAttribute("aria-expanded") : "",
        toggleCount: targetPre.querySelectorAll("[data-cgpt-code-toggle='1']").length,
        hostDisplay: host && host.style ? host.style.display : "",
        previewDisplay: preview && preview.style ? preview.style.display : "",
      };
    };

    const states = [snapshot()];
    targetPre.querySelector("[data-cgpt-code-toggle='1']")?.click();
    states.push(snapshot());
    targetPre.querySelector("[data-cgpt-code-toggle='1']")?.click();
    states.push(snapshot());
    return states;
  });

  expect(result).toEqual([
    {
      viewMode: "compact",
      toggleExpanded: "false",
      toggleCount: 1,
      hostDisplay: "none",
      previewDisplay: "block",
    },
    {
      viewMode: "expanded",
      toggleExpanded: "true",
      toggleCount: 1,
      hostDisplay: "",
      previewDisplay: "none",
    },
    {
      viewMode: "compact",
      toggleExpanded: "false",
      toggleCount: 1,
      hostDisplay: "none",
      previewDisplay: "block",
    },
  ]);
});
