const fs = require("fs/promises");
const path = require("path");
const { chromium } = require("playwright");
const {
  artifactsRoot,
  ensureDir,
  fixtureRoot,
  runHeadingCollection,
  scenarios,
} = require("../helpers/headingCollector");

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

function chunkScenarios(selectedScenarios, batchSize) {
  const chunks = [];
  for (let index = 0; index < selectedScenarios.length; index += batchSize) {
    chunks.push(selectedScenarios.slice(index, index + batchSize));
  }
  return chunks;
}

async function main() {
  const screenshotDir = path.join(artifactsRoot, "screenshots");
  const stateDir = path.join(artifactsRoot, "state");
  const traceDir = path.join(artifactsRoot, "traces");
  const profileBaseDir = path.join(artifactsRoot, "profiles");
  const fontConfigFile = path.join(__dirname, "..", "config", "fontconfig-windows-ja.conf");
  const env = {
    ...process.env,
    GTK_IM_MODULE: "fcitx",
    QT_IM_MODULE: "fcitx",
    XMODIFIERS: "@im=fcitx",
    SDL_IM_MODULE: "fcitx",
    INPUT_METHOD: "fcitx",
    FONTCONFIG_PATH: "/etc/fonts",
    FONTCONFIG_FILE: fontConfigFile,
  };
  const selectedScenarios = selectScenarios();
  const batchSize = Math.max(1, Number.parseInt(process.env.CHATGPT_BATCH_SIZE || "1", 10) || 1);
  const batchDelayMs = Math.max(
    0,
    Number.parseInt(process.env.CHATGPT_BATCH_DELAY_MS || "10000", 10) || 0
  );
  const batches = chunkScenarios(selectedScenarios, batchSize);

  await Promise.all([
    ensureDir(screenshotDir),
    ensureDir(stateDir),
    ensureDir(traceDir),
    ensureDir(profileBaseDir),
    ensureDir(fixtureRoot),
  ]);

  console.log(
    `Collecting ${selectedScenarios.length} heading scenarios in ${batches.length} anonymous batches (batch size: ${batchSize}).`
  );

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    const profileDir = await fs.mkdtemp(path.join(profileBaseDir, `run-${String(batchIndex + 1).padStart(2, "0")}-`));
    const tracePath = path.join(traceDir, `anonymous-batch-${String(batchIndex + 1).padStart(2, "0")}.zip`);

    console.log(
      `Starting anonymous heading batch ${batchIndex + 1}/${batches.length}: ${batch
        .map((scenario) => scenario.id)
        .join(", ")}`
    );

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

      await runHeadingCollection(page, batch);
      console.log(`Completed anonymous heading batch ${batchIndex + 1}/${batches.length}.`);
    } finally {
      await context.tracing.stop({ path: tracePath });
      await context.close();
    }

    if (batchDelayMs && batchIndex < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
    }
  }

  console.log(`Collected ${selectedScenarios.length} heading scenarios across ${batches.length} anonymous batches.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
