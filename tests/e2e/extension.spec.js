const fs = require("fs/promises");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { test, expect } = require("@playwright/test");
const { getBrowserLaunchEnv } = require("../helpers/browserLaunchEnv");

const execFileAsync = promisify(execFile);

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
  test.setTimeout(60_000);

  const consoleDir = path.join(artifactsRoot, "console");
  const stateDir = path.join(artifactsRoot, "state");
  const profileBaseDir = path.join(artifactsRoot, "profiles");

  await Promise.all([
    ensureDir(consoleDir),
    ensureDir(stateDir),
    ensureDir(profileBaseDir),
  ]);

  const profileDir = await fs.mkdtemp(path.join(profileBaseDir, "run-"));
  const script = `
    const { chromium } = require("@playwright/test");
    (async () => {
      const context = await chromium.launchPersistentContext(${JSON.stringify(profileDir)}, {
        channel: "chromium",
        headless: true,
        env: ${JSON.stringify(getBrowserLaunchEnv())},
        args: [
          ${JSON.stringify(`--disable-extensions-except=${extensionPath}`)},
          ${JSON.stringify(`--load-extension=${extensionPath}`)}
        ]
      });
      try {
        const serviceWorker =
          context.serviceWorkers()[0] ||
          (await context.waitForEvent("serviceworker", { timeout: 20000 }));
        const manifestState = await serviceWorker.evaluate(() => ({
          runtimeId: chrome.runtime.id,
          serviceWorkerUrl: self.location.href,
          manifest: chrome.runtime.getManifest(),
        }));
        process.stdout.write(JSON.stringify(manifestState));
      } finally {
        await context.close().catch(() => {});
      }
    })().catch((error) => {
      console.error(error && error.stack ? error.stack : String(error));
      process.exit(1);
    });
  `;

  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ["-e", script],
    {
      cwd: repoRoot,
      timeout: 45_000,
      env: {
        ...process.env,
        ...getBrowserLaunchEnv(),
      },
      maxBuffer: 1024 * 1024 * 4,
    }
  );

  const manifestState = JSON.parse(stdout.trim());

  await Promise.all([
    fs.writeFile(path.join(consoleDir, "playwright.log"), `${stderr || ""}\n`, "utf8"),
    writeJson(path.join(stateDir, "manifest.json"), manifestState),
  ]);

  expect(manifestState.runtimeId).toBeTruthy();
  expect(manifestState.manifest.name).toBe("ChatGPT Code Saver");
  expect(manifestState.manifest.background.service_worker).toBe("background/index.js");
  expect(manifestState.manifest.content_scripts[0].js).toContain("content/init.js");
});
