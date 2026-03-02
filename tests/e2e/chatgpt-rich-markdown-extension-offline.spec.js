const fs = require("fs/promises");
const path = require("path");
const { test, expect, chromium } = require("@playwright/test");
const { probeExtensionContext } = require("../helpers/e2eEnvironment");

const repoRoot = path.join(__dirname, "..", "..");
const testsRoot = path.join(__dirname, "..");
const extensionPath = path.join(repoRoot, "extension");
const artifactsRoot = path.join(testsRoot, "artifacts", "chatgpt-rich-markdown-extension-offline");

const scenarios = [
  {
    id: "task-list-and-horizontal-rule",
    prompt: "チャット内表現の崩れを確認したいので、チェックリストと区切り線を含めてください。",
    assistantInnerHtml: `
      <h2>Checklist</h2>
      <p>作業前に確認する項目です。</p>
      <ul>
        <li><input type="checkbox" checked disabled> 拡張を有効化する</li>
        <li><input type="checkbox" disabled> fixture を読み込む</li>
        <li><input type="checkbox" checked disabled> 結果を確認する</li>
      </ul>
      <hr />
      <p>区切り線の後にも本文が続きます。</p>
    `,
    expected: {
      headingFoldCount: 1,
      headingLevels: [2],
      rawHeadingTags: ["h2"],
      preCount: 0,
      inlineCodeCount: 0,
      strongCount: 0,
      emCount: 0,
      delCount: 0,
      markCount: 0,
      tableCount: 0,
      tableRowCount: 0,
      blockquoteCount: 0,
      unorderedListCount: 1,
      orderedListCount: 0,
      listItemCount: 3,
      horizontalRuleCount: 1,
      linkCount: 0,
      checkboxCount: 3,
      paragraphCount: 2,
    },
    toggleLevels: [2],
  },
  {
    id: "skipped-levels-with-table-and-quote",
    prompt: "見出しの飛びレベルと表や引用が fold 後も崩れないか確認したいです。",
    assistantInnerHtml: `
      <h2>Parent</h2>
      <p>親セクションには <a href="https://example.com/spec">仕様リンク</a> があります。</p>
      <h4>Deep Child</h4>
      <table>
        <thead>
          <tr><th>列A</th><th>列B</th></tr>
        </thead>
        <tbody>
          <tr><td>alpha</td><td>beta</td></tr>
          <tr><td>gamma</td><td>delta</td></tr>
        </tbody>
      </table>
      <blockquote>
        <p>引用ブロックも保持される必要があります。</p>
      </blockquote>
      <h3>Middle Child</h3>
      <p>コードブロックも同じメッセージ内に置きます。</p>
      <pre><code>const total = rows.length;
console.log(total);</code></pre>
    `,
    expected: {
      headingFoldCount: 3,
      headingLevels: [2, 4, 3],
      rawHeadingTags: ["h2", "h4", "h3"],
      preCount: 1,
      inlineCodeCount: 0,
      strongCount: 0,
      emCount: 0,
      delCount: 0,
      markCount: 0,
      tableCount: 1,
      tableRowCount: 3,
      blockquoteCount: 1,
      unorderedListCount: 0,
      orderedListCount: 0,
      listItemCount: 0,
      horizontalRuleCount: 0,
      linkCount: 1,
      checkboxCount: 0,
      paragraphCount: 3,
    },
    toggleLevels: [2, 3, 4],
  },
  {
    id: "kitchen-sink-inline-and-blocks",
    prompt: "実チャットに近い混在 markdown を 1 メッセージにまとめてください。",
    assistantInnerHtml: `
      <h1>Overview</h1>
      <p><strong>太字</strong>、<em>斜体</em>、<del>取り消し</del>、<mark>強調</mark>、<code>npm test</code>、<a href="https://example.com/demo">リンク</a>、😀 を同居させます。</p>
      <h2>Lists</h2>
      <ul>
        <li>箇条書き 1</li>
        <li>箇条書き 2</li>
      </ul>
      <ol>
        <li>番号付き 1</li>
        <li>番号付き 2</li>
      </ol>
      <h3>Code</h3>
      <pre><code>// file: src/demo.js
export function sum(a, b) {
  return a + b;
}</code></pre>
      <h3>Notes</h3>
      <blockquote>
        <p>引用の段落も残る必要があります。</p>
      </blockquote>
      <table>
        <thead>
          <tr><th>項目</th><th>値</th></tr>
        </thead>
        <tbody>
          <tr><td>mode</td><td>compact</td></tr>
        </tbody>
      </table>
    `,
    expected: {
      headingFoldCount: 4,
      headingLevels: [1, 2, 3, 3],
      rawHeadingTags: ["h1", "h2", "h3", "h3"],
      preCount: 1,
      inlineCodeCount: 1,
      strongCount: 1,
      emCount: 1,
      delCount: 1,
      markCount: 1,
      tableCount: 1,
      tableRowCount: 2,
      blockquoteCount: 1,
      unorderedListCount: 1,
      orderedListCount: 1,
      listItemCount: 4,
      horizontalRuleCount: 0,
      linkCount: 1,
      checkboxCount: 0,
      paragraphCount: 2,
    },
    toggleLevels: [1, 2, 3],
  },
];

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function buildMockPageHtml({ prompt, assistantInnerHtml }) {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Offline Rich Markdown Fixture</title>
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
        overflow: auto;
        padding: 18px 20px;
        border-radius: 12px;
        background: #0f172a;
        color: #f9fafb;
      }
      code {
        font-family: "Courier New", monospace;
      }
      table {
        border-collapse: collapse;
        width: 100%;
      }
      th,
      td {
        border: 1px solid #94a3b8;
        padding: 8px;
      }
      blockquote {
        margin: 16px 0;
        padding-left: 16px;
        border-left: 4px solid #94a3b8;
      }
      textarea {
        width: 100%;
        min-height: 140px;
      }
    </style>
  </head>
  <body>
    <main>
      <div data-message-author-role="user" data-message-id="fixture-user-1">
        <p>${prompt.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        <time datetime="2026-03-01T12:00:00.000Z">2026-03-01 21:00</time>
      </div>
      <div data-message-author-role="assistant" data-message-id="fixture-assistant-1">
        ${assistantInnerHtml}
        <time datetime="2026-03-01T12:00:05.000Z">2026-03-01 21:00</time>
      </div>
      <textarea data-testid="chat-input" name="prompt-textarea"></textarea>
    </main>
  </body>
</html>`;
}

function headingLevelRow(page, level) {
  return page
    .locator("#cgpt-code-helper-panel span")
    .filter({ hasText: `Level ${level}` })
    .first()
    .locator("xpath=ancestor::div[1]");
}

async function readAssistantStructure(page) {
  return page.locator("[data-message-author-role='assistant']").first().evaluate((element) => {
    const scope = element.querySelector(".cgpt-helper-message-body") || element;
    const count = (selector) => scope.querySelectorAll(selector).length;
    return {
      headingFoldCount: count(".cgpt-helper-heading-fold"),
      headingLevels: Array.from(scope.querySelectorAll(".cgpt-helper-heading-fold")).map((node) =>
        Number.parseInt(node.getAttribute("data-cgpt-helper-fold-level") || "0", 10)
      ),
      rawHeadingTags: Array.from(scope.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((node) =>
        node.tagName.toLowerCase()
      ),
      preCount: count("pre"),
      inlineCodeCount: Array.from(scope.querySelectorAll("code")).filter(
        (node) => !node.closest("pre")
      ).length,
      strongCount: count("strong"),
      emCount: count("em"),
      delCount: count("del"),
      markCount: count("mark"),
      tableCount: count("table"),
      tableRowCount: count("table tr"),
      blockquoteCount: count("blockquote"),
      unorderedListCount: count("ul"),
      orderedListCount: count("ol"),
      listItemCount: count("li"),
      horizontalRuleCount: count("hr"),
      linkCount: count("a[href]"),
      checkboxCount: count("input[type='checkbox']"),
      paragraphCount: count("p"),
    };
  });
}

async function assertToggleWorksForLevel(page, level) {
  const row = headingLevelRow(page, level);
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "Compact All" }).click();
  await expect
    .poll(async () => {
      return page
        .locator(`.cgpt-helper-heading-fold[data-cgpt-helper-fold-level='${level}']`)
        .evaluateAll((elements) =>
          elements.every((element) => element.getAttribute("data-cgpt-helper-fold-open") === "0")
        );
    })
    .toBeTruthy();

  await row.getByRole("button", { name: "Expand All" }).click();
  await expect
    .poll(async () => {
      return page
        .locator(`.cgpt-helper-heading-fold[data-cgpt-helper-fold-level='${level}']`)
        .evaluateAll((elements) =>
          elements.every((element) => element.getAttribute("data-cgpt-helper-fold-open") === "1")
        );
    })
    .toBeTruthy();
}

test.describe("offline rich markdown fixtures with extension", () => {
  for (const scenario of scenarios) {
    test(`preserves ${scenario.id}`, async () => {
      test.setTimeout(120_000);

      const scenarioDir = path.join(artifactsRoot, scenario.id);
      const screenshotDir = path.join(scenarioDir, "screenshots");
      const stateDir = path.join(scenarioDir, "state");
      const traceDir = path.join(scenarioDir, "traces");
      const profileBaseDir = path.join(scenarioDir, "profiles");

      await Promise.all([
        ensureDir(screenshotDir),
        ensureDir(stateDir),
        ensureDir(traceDir),
        ensureDir(profileBaseDir),
      ]);

      const profileDir = await fs.mkdtemp(path.join(profileBaseDir, "run-"));
      const launchProbe = await probeExtensionContext({
        chromium,
        profileDir,
        extensionPath,
      });
      test.skip(!launchProbe.ok, launchProbe.reason);
      const context = launchProbe.context;

      try {
        await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

        const page = await context.newPage();
        await page.route("https://chatgpt.com/**", async (route) => {
          if (route.request().resourceType() !== "document") {
            await route.fulfill({
              status: 204,
              contentType: "text/plain; charset=utf-8",
              body: "",
            });
            return;
          }
          await route.fulfill({
            status: 200,
            contentType: "text/html; charset=utf-8",
            body: buildMockPageHtml({
              prompt: scenario.prompt,
              assistantInnerHtml: scenario.assistantInnerHtml,
            }),
          });
        });

        await page.goto(`https://chatgpt.com/c/offline-rich-${scenario.id}`, {
          waitUntil: "domcontentloaded",
        });

        await expect(page.locator("#cgpt-code-helper-panel")).toBeVisible();
        await expect(page.locator(".cgpt-helper-message-body")).toHaveCount(2);

        await expect
          .poll(async () => readAssistantStructure(page), { timeout: 10_000 })
          .toEqual(scenario.expected);

        for (const level of scenario.toggleLevels) {
          await assertToggleWorksForLevel(page, level);
        }

        await expect(readAssistantStructure(page)).resolves.toEqual(scenario.expected);

        const actual = await readAssistantStructure(page);
        await Promise.all([
          page.screenshot({
            path: path.join(screenshotDir, `${scenario.id}.png`),
            fullPage: true,
          }),
          fs.writeFile(
            path.join(stateDir, "structure.json"),
            `${JSON.stringify({ expected: scenario.expected, actual }, null, 2)}\n`,
            "utf8"
          ),
        ]);
      } finally {
        await context.tracing.stop({ path: path.join(traceDir, "trace.zip") });
        await context.close();
      }
    });
  }
});
