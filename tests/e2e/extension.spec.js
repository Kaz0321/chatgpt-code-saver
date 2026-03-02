const fs = require("fs/promises");
const path = require("path");
const { test, expect, chromium } = require("@playwright/test");
const { getBrowserLaunchEnv } = require("../helpers/browserLaunchEnv");

const repoRoot = path.join(__dirname, "..", "..");
const testsRoot = path.join(__dirname, "..");
const extensionPath = path.join(repoRoot, "extension");
const artifactsRoot = path.join(testsRoot, "artifacts");

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test("loads the extension service worker and records manifest metadata", async () => {
  const consoleDir = path.join(artifactsRoot, "console");
  const stateDir = path.join(artifactsRoot, "state");
  const traceDir = path.join(artifactsRoot, "traces");
  const profileBaseDir = path.join(artifactsRoot, "profiles");

  await Promise.all([
    ensureDir(consoleDir),
    ensureDir(stateDir),
    ensureDir(traceDir),
    ensureDir(profileBaseDir)
  ]);

  const profileDir = await fs.mkdtemp(path.join(profileBaseDir, "run-"));

  const context = await chromium.launchPersistentContext(profileDir, {
    channel: "chromium",
    headless: true,
    env: getBrowserLaunchEnv(),
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });

  const consoleLines = [];

  try {
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

    const serviceWorker =
      context.serviceWorkers()[0] ||
      (await context.waitForEvent("serviceworker", { timeout: 20_000 }));

    const manifestState = await serviceWorker.evaluate(() => {
      return {
        runtimeId: chrome.runtime.id,
        serviceWorkerUrl: self.location.href,
        manifest: chrome.runtime.getManifest()
      };
    });

    await Promise.all([
      fs.writeFile(path.join(consoleDir, "playwright.log"), `${consoleLines.join("\n")}\n`, "utf8"),
      writeJson(path.join(stateDir, "manifest.json"), manifestState)
    ]);

    expect(manifestState.runtimeId).toBeTruthy();
    expect(manifestState.manifest.name).toBe("gpt-code-saver-extension");
    expect(manifestState.manifest.background.service_worker).toBe("background/index.js");
    expect(manifestState.manifest.content_scripts[0].js).toContain("content/init.js");
  } finally {
    await context.tracing.stop({ path: path.join(traceDir, "trace.zip") });
    await context.close();
  }
});
