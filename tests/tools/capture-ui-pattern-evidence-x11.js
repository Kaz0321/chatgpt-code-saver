const fs = require("fs/promises");
const path = require("path");
const { chromium } = require("playwright");

const repoRoot = path.join(__dirname, "..", "..");
const testsRoot = path.join(__dirname, "..");
const extensionPath = path.join(repoRoot, "extension");
const manifestPath = path.join(testsRoot, "fixtures", "live-ui-patterns", "manifest.json");
const fixtureRoot = path.join(testsRoot, "fixtures", "live-ui-patterns");
const artifactsRoot = path.join(testsRoot, "artifacts", "ui-pattern-evidence-x11");

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function buildEnv() {
  const fontConfigFile = path.join(testsRoot, "config", "fontconfig-windows-ja.conf");
  return {
    ...process.env,
    GTK_IM_MODULE: "fcitx",
    QT_IM_MODULE: "fcitx",
    XMODIFIERS: "@im=fcitx",
    SDL_IM_MODULE: "fcitx",
    INPUT_METHOD: "fcitx",
    FONTCONFIG_PATH: "/etc/fonts",
    FONTCONFIG_FILE: fontConfigFile,
  };
}

function buildMockPageHtml({ prompt, assistantOuterHtml }) {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Offline ChatGPT UI Pattern Fixture</title>
    <style>
      body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f7f7f8; color: #1f2937; }
      main { max-width: 960px; margin: 0 auto; padding: 32px 24px 120px; }
      [data-message-author-role] { margin-bottom: 24px; padding: 20px; border-radius: 16px; background: #ffffff; border: 1px solid #e5e7eb; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06); }
      pre { overflow: auto; padding: 18px 20px; border-radius: 12px; background: #f3f4f6; color: #111827; border: 1px solid #e5e7eb; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      table { border-collapse: collapse; width: 100%; background: #ffffff; }
      th, td { border: 1px solid #cbd5e1; padding: 8px; }
      blockquote { margin: 16px 0; padding-left: 16px; border-left: 4px solid #cbd5e1; color: #475569; }
      textarea { width: 100%; min-height: 140px; }
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

function selectScenarios(manifest) {
  const requestedIds = String(process.env.CHATGPT_SCENARIO_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const validated = (manifest.scenarios || []).filter((scenario) => scenario.validated);
  if (!requestedIds.length) {
    return validated;
  }
  return validated.filter((scenario) => requestedIds.includes(scenario.id));
}

async function poll(fn, predicate, timeoutMs = 10000, intervalMs = 200) {
  const start = Date.now();
  let lastValue;
  while (Date.now() - start < timeoutMs) {
    lastValue = await fn();
    if (predicate(lastValue)) {
      return lastValue;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for condition. Last value: ${JSON.stringify(lastValue)}`);
}

async function readAssistantSummary(page) {
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

async function runScenario(context, scenario) {
  const page = context.pages()[0] || (await context.newPage());
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
      body: buildMockPageHtml({
        prompt: scenario.prompt,
        assistantOuterHtml,
      }),
    });
  });

  await page.goto(`https://chatgpt.com/c/offline-${scenario.id}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });

  const assistantSummary = await poll(
    () => readAssistantSummary(page),
    (value) => JSON.stringify(value) === JSON.stringify(scenario.summary),
    10000
  );

  const expectedLevels = scenario.summary.headingTags.map((tagName) =>
    Number.parseInt(String(tagName).replace(/^h/i, ""), 10)
  );
  const actualLevels = await poll(
    () => page.locator(".cgpt-helper-heading-fold").evaluateAll((elements) => {
      return elements.map((element) =>
        Number.parseInt(element.getAttribute("data-cgpt-helper-fold-level") || "0", 10)
      );
    }),
    (value) => JSON.stringify(value) === JSON.stringify(expectedLevels),
    10000
  );

  const scenarioDir = path.join(artifactsRoot, scenario.id);
  const screenshotDir = path.join(scenarioDir, "screenshots");
  const stateDir = path.join(scenarioDir, "state");
  await Promise.all([ensureDir(screenshotDir), ensureDir(stateDir)]);

  const screenshotPath = path.join(screenshotDir, `${scenario.id}.png`);
  await Promise.all([
    page.screenshot({
      path: screenshotPath,
      fullPage: true,
    }),
    fs.writeFile(
      path.join(stateDir, "verification.json"),
      `${JSON.stringify(
        {
          scenarioId: scenario.id,
          assistantSummary,
          expectedLevels,
          actualLevels,
          screenshotPath,
        },
        null,
        2
      )}\n`,
      "utf8"
    ),
  ]);

  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});

  return {
    scenarioId: scenario.id,
    ok: true,
    screenshotPath,
    expectedLevels,
    actualLevels,
  };
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const scenarios = selectScenarios(manifest);
  if (!scenarios.length) {
    throw new Error("No validated scenarios selected.");
  }

  await ensureDir(artifactsRoot);
  const env = buildEnv();
  const summary = {
    startedAt: new Date().toISOString(),
    scenarioIds: scenarios.map((scenario) => scenario.id),
    results: [],
  };

  for (const scenario of scenarios) {
    const profileDir = await fs.mkdtemp(path.join(artifactsRoot, `run-${scenario.id}-`));
    const context = await chromium.launchPersistentContext(profileDir, {
      channel: "chromium",
      headless: false,
      env,
      args: [
        "--ozone-platform=x11",
        "--disable-software-rasterizer",
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
      ignoreDefaultArgs: ["--enable-unsafe-swiftshader"],
      viewport: { width: 1280, height: 1024 },
    });

    try {
      const result = await runScenario(context, scenario);
      summary.results.push(result);
    } catch (error) {
      summary.results.push({
        scenarioId: scenario.id,
        ok: false,
        error: error.message,
      });
    } finally {
      await context.close().catch(() => {});
    }
  }

  summary.finishedAt = new Date().toISOString();
  summary.failed = summary.results.filter((result) => !result.ok);

  await fs.writeFile(
    path.join(artifactsRoot, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8"
  );

  console.log(`Captured evidence for ${summary.results.length} scenarios. Failures: ${summary.failed.length}`);
  if (summary.failed.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
