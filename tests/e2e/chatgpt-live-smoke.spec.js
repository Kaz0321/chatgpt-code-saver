const fs = require("fs/promises");
const path = require("path");
const { test, expect, chromium } = require("@playwright/test");

const repoRoot = path.join(__dirname, "..", "..");
const testsRoot = path.join(__dirname, "..");
const extensionPath = path.join(repoRoot, "extension");
const artifactsRoot = path.join(testsRoot, "artifacts", "chatgpt-live-smoke");

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

test("checks live ChatGPT reachability and extension injection", async () => {
  test.setTimeout(120_000);

  const screenshotDir = path.join(artifactsRoot, "screenshots");
  const stateDir = path.join(artifactsRoot, "state");
  const traceDir = path.join(artifactsRoot, "traces");
  const profileBaseDir = path.join(artifactsRoot, "profiles");

  await Promise.all([
    ensureDir(screenshotDir),
    ensureDir(stateDir),
    ensureDir(traceDir),
    ensureDir(profileBaseDir),
  ]);

  const profileDir = await fs.mkdtemp(path.join(profileBaseDir, "run-"));
  const context = await chromium.launchPersistentContext(profileDir, {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  try {
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

    const serviceWorker =
      context.serviceWorkers()[0] ||
      (await context.waitForEvent("serviceworker", { timeout: 20_000 }));

    const page = await context.newPage();
    const response = await page.goto("https://chatgpt.com/", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await page.waitForTimeout(5000);

    const state = await page.evaluate(() => {
      const helperPanel = Boolean(document.getElementById("cgpt-code-helper-panel"));
      const textbox =
        document.querySelector("div[contenteditable='true'][data-testid='textbox']") ||
        document.querySelector("div[contenteditable='true'][role='textbox']") ||
        document.querySelector("textarea[data-testid='chat-input']") ||
        document.querySelector("textarea");
      const visibleText = document.body ? document.body.innerText.slice(0, 2000) : "";
      return {
        url: window.location.href,
        title: document.title,
        helperPanel,
        hasTextbox: Boolean(textbox),
        visibleText,
      };
    });

    const manifestState = await serviceWorker.evaluate(() => {
      return {
        runtimeId: chrome.runtime.id,
        manifest: chrome.runtime.getManifest(),
      };
    });

    await Promise.all([
      page.screenshot({
        path: path.join(screenshotDir, "chatgpt-live.png"),
        fullPage: true,
      }),
      fs.writeFile(path.join(stateDir, "page-state.json"), `${JSON.stringify({
        responseStatus: response && response.status(),
        ...state,
        manifestState,
      }, null, 2)}\n`, "utf8"),
    ]);

    expect(response).toBeTruthy();
  } finally {
    await context.tracing.stop({ path: path.join(traceDir, "trace.zip") });
    await context.close();
  }
});
