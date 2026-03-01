const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { test, expect, chromium } = require("@playwright/test");

const testsRoot = path.join(__dirname, "..");
const artifactsRoot = path.join(testsRoot, "artifacts", "chatgpt-ui-patterns-offline");
const fixtureRoot = path.join(testsRoot, "fixtures", "live-ui-patterns");
const manifestPath = path.join(fixtureRoot, "manifest.json");

async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

async function readAssistantCounts(page) {
  return page.locator("[data-message-author-role='assistant']").last().evaluate((element) => {
    const headingTags = Array.from(element.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((heading) =>
      heading.tagName.toLowerCase()
    );
    const inlineCodeCount = Array.from(element.querySelectorAll("code")).filter(
      (node) => !node.closest("pre")
    ).length;
    return {
      headingTags,
      codeBlockCount: element.querySelectorAll("pre").length,
      inlineCodeCount,
      linkCount: element.querySelectorAll("a[href]").length,
      blockquoteCount: element.querySelectorAll("blockquote").length,
      nestedBlockquoteCount: Array.from(element.querySelectorAll("blockquote")).filter(
        (node) => node.querySelector("blockquote")
      ).length,
      checkboxCount: element.querySelectorAll("input[type='checkbox']").length,
      tableCount: element.querySelectorAll("table").length,
      tableRowCount: element.querySelectorAll("table tr").length,
      unorderedListCount: element.querySelectorAll("ul").length,
      orderedListCount: element.querySelectorAll("ol").length,
      listItemCount: element.querySelectorAll("li").length,
      paragraphCount: element.querySelectorAll("p").length,
      horizontalRuleCount: element.querySelectorAll("hr").length,
    };
  });
}

function buildMockPageHtml({ prompt, assistantOuterHtml }) {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Offline ChatGPT UI Pattern Fixture</title>
    <style>
      body { margin: 0; font-family: sans-serif; background: #f5f5f5; color: #111; }
      main { max-width: 960px; margin: 0 auto; padding: 32px 24px 120px; }
      [data-message-author-role] { margin-bottom: 24px; padding: 20px; border-radius: 16px; background: #fff; }
      pre { overflow: auto; padding: 18px 20px; border-radius: 12px; background: #111827; color: #f9fafb; }
      code { font-family: "Courier New", monospace; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ccc; padding: 8px; }
      blockquote { margin: 16px 0; padding-left: 16px; border-left: 4px solid #999; }
    </style>
  </head>
  <body>
    <main>
      <div data-message-author-role="user" data-message-id="fixture-user-1">
        <pre>${prompt.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
      </div>
      ${assistantOuterHtml}
    </main>
  </body>
</html>`;
}

test.describe("offline chatgpt ui pattern fixtures", () => {
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    : null;

  const scenarios = manifest?.scenarios?.filter((scenario) => scenario.validated) || [];

  if (!scenarios.length) {
    test("skips when no validated live ui fixtures are collected", async () => {
      test.skip(true, "Run `npm run collect:ui-patterns:x11` first to generate validated live ui fixtures.");
    });
    return;
  }

  for (const scenario of scenarios) {
    test(`replays ${scenario.id}`, async () => {
      const scenarioDir = path.join(artifactsRoot, scenario.id);
      const screenshotDir = path.join(scenarioDir, "screenshots");
      const stateDir = path.join(scenarioDir, "state");
      const profileBaseDir = path.join(scenarioDir, "profiles");
      await Promise.all([ensureDir(screenshotDir), ensureDir(stateDir), ensureDir(profileBaseDir)]);

      const assistantOuterHtml = await fsp.readFile(
        path.join(fixtureRoot, scenario.responseOuterHtmlFile || scenario.responseHtmlFile),
        "utf8"
      );

      const profileDir = await fsp.mkdtemp(path.join(profileBaseDir, "run-"));
      const context = await chromium.launchPersistentContext(profileDir, {
        channel: "chromium",
        headless: true,
      });

      try {
        const page = await context.newPage();
        await page.setContent(
          buildMockPageHtml({
            prompt: scenario.prompt,
            assistantOuterHtml,
          }),
          { waitUntil: "domcontentloaded" }
        );

        await expect(page.locator("[data-message-author-role='assistant']")).toHaveCount(1);
        await expect
          .poll(async () => readAssistantCounts(page), { timeout: 10_000 })
          .toEqual(scenario.summary);
        const counts = await readAssistantCounts(page);

        await Promise.all([
          page.screenshot({
            path: path.join(screenshotDir, `${scenario.id}.png`),
            fullPage: true,
          }),
          fsp.writeFile(
            path.join(stateDir, "counts.json"),
            `${JSON.stringify(counts, null, 2)}\n`,
            "utf8"
          ),
        ]);
      } finally {
        await context.close();
      }
    });
  }
});
