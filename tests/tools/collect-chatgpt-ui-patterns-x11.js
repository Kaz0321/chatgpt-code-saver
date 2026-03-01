const fs = require("fs/promises");
const path = require("path");
const { chromium } = require("playwright");
const {
  artifactsRoot,
  fixtureRoot,
  scenarios,
  ensureDir,
  safeSlug,
  submitPrompt,
  collectScenarioResult,
  validateScenario,
  saveScenarioArtifacts,
  writeManifest,
} = require("../helpers/chatgptUiPatternCollector");

function selectScenarios() {
  const requestedIds = String(process.env.CHATGPT_SCENARIO_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!requestedIds.length) {
    return scenarios;
  }

  const selected = scenarios.filter((scenario) => requestedIds.includes(scenario.id));
  if (!selected.length) {
    throw new Error(`No scenarios matched CHATGPT_SCENARIO_IDS=${requestedIds.join(",")}`);
  }
  return selected;
}

function buildEnv() {
  const fontConfigFile = path.join(__dirname, "..", "config", "fontconfig-windows-ja.conf");
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

async function collectOneScenario(scenario, maxAttempts) {
  const env = buildEnv();
  const tracesDir = path.join(artifactsRoot, "traces");
  const screenshotsDir = path.join(artifactsRoot, "screenshots");
  const stateDir = path.join(artifactsRoot, "state");
  let lastError = null;

  await Promise.all([
    ensureDir(tracesDir),
    ensureDir(screenshotsDir),
    ensureDir(stateDir),
    ensureDir(fixtureRoot),
  ]);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const profileDir = await fs.mkdtemp(path.join(artifactsRoot, `run-${safeSlug(scenario.id)}-`));
    const tracePath = path.join(
      tracesDir,
      attempt === 1 ? `${safeSlug(scenario.id)}.zip` : `${safeSlug(scenario.id)}.attempt-${attempt}.zip`
    );

    console.log(`Scenario ${scenario.id}: attempt ${attempt}/${maxAttempts}`);

    const context = await chromium.launchPersistentContext(profileDir, {
      channel: "chromium",
      headless: false,
      env,
      args: [
        "--ozone-platform=x11",
        "--disable-software-rasterizer",
      ],
      ignoreDefaultArgs: ["--enable-unsafe-swiftshader"],
      viewport: { width: 1280, height: 1024 },
    });

    try {
      await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
      const page = context.pages()[0] || (await context.newPage());
      await page.goto("https://chatgpt.com/", {
        waitUntil: "domcontentloaded",
        timeout: 120_000,
      });

      const assistantLocator = await submitPrompt(page, scenario.prompt);
      const result = await collectScenarioResult(assistantLocator);
      const validation = validateScenario(scenario, result);
      const { htmlFileName, outerHtmlFileName, screenshotPath } = await saveScenarioArtifacts({
        scenario,
        attempt,
        result,
        validation,
      });

      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });

      if (validation.ok) {
        return {
          id: scenario.id,
          label: scenario.label,
          prompt: scenario.prompt,
          responseHtmlFile: htmlFileName,
          responseOuterHtmlFile: outerHtmlFileName,
          validated: true,
          validationErrors: [],
          summary: {
            headingTags: result.headingTags,
            codeBlockCount: result.codeBlockCount,
            inlineCodeCount: result.inlineCodeCount,
            linkCount: result.linkCount,
            blockquoteCount: result.blockquoteCount,
            nestedBlockquoteCount: result.nestedBlockquoteCount,
            checkboxCount: result.checkboxCount,
            tableCount: result.tableCount,
            tableRowCount: result.tableRowCount,
            unorderedListCount: result.unorderedListCount,
            orderedListCount: result.orderedListCount,
            listItemCount: result.listItemCount,
            paragraphCount: result.paragraphCount,
            horizontalRuleCount: result.horizontalRuleCount,
          },
          textPreview: result.text.slice(0, 400),
        };
      }

      console.warn(`Scenario ${scenario.id} failed validation: ${validation.errors.join(" | ")}`);
      lastError = new Error(validation.errors.join(" | "));
    } catch (error) {
      lastError = error;
      console.warn(`Scenario ${scenario.id} attempt ${attempt} failed: ${error.message}`);
      await fs.writeFile(
        path.join(stateDir, `${safeSlug(scenario.id)}.attempt-${attempt}.error.json`),
        `${JSON.stringify({ scenario, attempt, error: { message: error.message, stack: error.stack } }, null, 2)}\n`,
        "utf8"
      );
    } finally {
      await context.tracing.stop({ path: tracePath }).catch(() => {});
      await context.close().catch(() => {});
    }
  }

  return {
    id: scenario.id,
    label: scenario.label,
    prompt: scenario.prompt,
    validated: false,
    validationErrors: [lastError ? lastError.message : `Failed validation after ${maxAttempts} attempts.`],
  };
}

async function main() {
  const selectedScenarios = selectScenarios();
  const maxAttempts = Number.parseInt(process.env.CHATGPT_MAX_ATTEMPTS || "2", 10);
  const entries = [];

  await Promise.all([
    ensureDir(artifactsRoot),
    ensureDir(fixtureRoot),
  ]);

  for (const scenario of selectedScenarios) {
    const entry = await collectOneScenario(scenario, maxAttempts);
    entries.push(entry);
    await writeManifest(entries);
  }

  const validatedCount = entries.filter((entry) => entry.validated).length;
  console.log(`Collected ${validatedCount}/${entries.length} validated scenarios.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
