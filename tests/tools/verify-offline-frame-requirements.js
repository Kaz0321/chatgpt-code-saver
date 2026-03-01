const fs = require("fs/promises");
const path = require("path");
const { chromium } = require("playwright");

const repoRoot = path.join(__dirname, "..", "..");
const testsRoot = path.join(__dirname, "..");
const fixtureRoot = path.join(testsRoot, "fixtures", "live-ui-patterns");
const manifestPath = path.join(fixtureRoot, "manifest.json");
const extensionPath = path.join(repoRoot, "extension");
const artifactsRoot = path.join(testsRoot, "artifacts");

function buildMinimalShellHtml({ prompt, assistantOuterHtml }) {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Offline ChatGPT Fixture</title>
    <style>
      body { margin: 0; font-family: sans-serif; background: #f5f5f5; color: #111; }
      main { max-width: 960px; margin: 0 auto; padding: 32px 24px 120px; }
      [data-message-author-role] { margin-bottom: 24px; padding: 20px; border-radius: 16px; background: #fff; }
      pre { overflow: auto; padding: 18px 20px; border-radius: 12px; background: #111827; color: #f9fafb; }
      code { font-family: "Courier New", monospace; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ccc; padding: 8px; }
      blockquote { margin: 16px 0; padding-left: 16px; border-left: 4px solid #999; }
      textarea { width: 100%; min-height: 120px; }
    </style>
  </head>
  <body>
    <main>
      <div data-message-author-role="user" data-message-id="fixture-user-1">
        <pre>${String(prompt || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
      </div>
      ${assistantOuterHtml}
      <textarea data-testid="chat-input" name="prompt-textarea"></textarea>
    </main>
  </body>
</html>`;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function pollUntil(fn, predicate, { timeoutMs = 10000, intervalMs = 200 } = {}) {
  const startedAt = Date.now();
  let lastValue;
  while (Date.now() - startedAt < timeoutMs) {
    lastValue = await fn();
    if (predicate(lastValue)) {
      return lastValue;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for condition. Last value: ${JSON.stringify(lastValue)}`);
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

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function verifyMinimalShell(manifest) {
  const browser = await chromium.launch({ channel: "chromium", headless: true });
  const results = [];
  try {
    for (const scenario of manifest.scenarios) {
      const page = await browser.newPage();
      try {
        const assistantOuterHtml = await fs.readFile(
          path.join(fixtureRoot, scenario.responseOuterHtmlFile || scenario.responseHtmlFile),
          "utf8"
        );
        await page.setContent(
          buildMinimalShellHtml({
            prompt: scenario.prompt,
            assistantOuterHtml,
          }),
          { waitUntil: "domcontentloaded" }
        );
        await pollUntil(
          () => page.locator("[data-message-author-role='assistant']").count(),
          (count) => count === 1
        );
        const actual = await pollUntil(
          () => readAssistantCounts(page),
          (value) => sameJson(value, scenario.summary)
        );
        results.push({
          id: scenario.id,
          ok: true,
          summary: actual,
        });
      } catch (error) {
        results.push({
          id: scenario.id,
          ok: false,
          error: error.message,
        });
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  return results;
}

async function verifyExtensionMinimalShell(manifest) {
  const results = [];

  for (const scenario of manifest.scenarios) {
    const profileBaseDir = path.join(artifactsRoot, "chatgpt-ui-patterns-extension-offline", scenario.id, "profiles");
    await ensureDir(profileBaseDir);
    const profileDir = await fs.mkdtemp(path.join(profileBaseDir, "verify-"));
    const context = await chromium.launchPersistentContext(profileDir, {
      channel: "chromium",
      headless: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    try {
      const page = await context.newPage();
      const assistantOuterHtml = await fs.readFile(
        path.join(fixtureRoot, scenario.responseOuterHtmlFile || scenario.responseHtmlFile),
        "utf8"
      );
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
          body: buildMinimalShellHtml({
            prompt: scenario.prompt,
            assistantOuterHtml,
          }),
        });
      });

      await page.goto(`https://chatgpt.com/c/offline-${scenario.id}`, {
        waitUntil: "domcontentloaded",
      });

      await pollUntil(
        () => page.locator("#cgpt-code-helper-panel").count(),
        (count) => count > 0
      );

      const expectedLevels = scenario.summary.headingTags.map((tagName) =>
        Number.parseInt(String(tagName).replace(/^h/i, ""), 10)
      );

      await pollUntil(
        () => page.locator(".cgpt-helper-heading-fold").count(),
        (count) => count === expectedLevels.length
      );

      const actualLevels = await page.locator(".cgpt-helper-heading-fold").evaluateAll((elements) => {
        return elements.map((element) =>
          Number.parseInt(element.getAttribute("data-cgpt-helper-fold-level") || "0", 10)
        );
      });

      if (!sameJson(actualLevels, expectedLevels)) {
        throw new Error(`Heading levels mismatch expected=${JSON.stringify(expectedLevels)} actual=${JSON.stringify(actualLevels)}`);
      }

      results.push({
        id: scenario.id,
        ok: true,
        expectedLevels,
        actualLevels,
      });
    } catch (error) {
      results.push({
        id: scenario.id,
        ok: false,
        error: error.message,
      });
    } finally {
      await context.close().catch(() => {});
    }
  }

  return results;
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const minimalShell = await verifyMinimalShell(manifest);
  const extensionMinimalShell = await verifyExtensionMinimalShell(manifest);

  const report = {
    checkedAt: new Date().toISOString(),
    source: "chatgpt.com",
    frameRequired: false,
    fixtureType: "live assistant outerHTML inside minimal replay shell",
    scenarioCount: manifest.scenarios.length,
    minimalShell,
    extensionMinimalShell,
  };

  const reportPath = path.join(artifactsRoot, "chatgpt-ui-patterns-offline", "state", "offline-frame-verification.json");
  await ensureDir(path.dirname(reportPath));
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const hasFailure = [...minimalShell, ...extensionMinimalShell].some((entry) => !entry.ok);
  console.log(`Verified minimal shell for ${manifest.scenarios.length} scenarios. Failures: ${hasFailure ? "yes" : "no"}`);
  if (hasFailure) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
