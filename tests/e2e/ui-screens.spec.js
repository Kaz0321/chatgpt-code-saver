const fs = require("fs/promises");
const path = require("path");
const { test, expect, chromium } = require("@playwright/test");
const { probeExtensionContext } = require("../helpers/e2eEnvironment");

const repoRoot = path.join(__dirname, "..", "..");
const testsRoot = path.join(__dirname, "..");
const extensionPath = path.join(repoRoot, "extension");
const fixturePath = path.join(testsRoot, "fixtures", "chatgpt-mock.html");
const artifactsRoot = path.join(testsRoot, "artifacts", "ui-screen-checks");

const LOG_STORAGE_KEY = "cgptHelper.logs";
const PROJECT_FOLDER_STORAGE_KEY = "cgptProjectFolderPath";

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function createMockContext(testInfo) {
  const profileBaseDir = path.join(artifactsRoot, "profiles");
  await ensureDir(profileBaseDir);
  const profileDir = await fs.mkdtemp(path.join(profileBaseDir, `${testInfo.title.replace(/[^\w-]+/g, "-")}-`));
  const launchProbe = await probeExtensionContext({
    chromium,
    profileDir,
    extensionPath,
  });
  return launchProbe;
}

async function createMockPage(context) {
  const fixtureHtml = await fs.readFile(fixturePath, "utf8");
  const page = await context.newPage();
  await page.route("https://chatgpt.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: fixtureHtml,
    });
  });
  await page.goto("https://chatgpt.com/c/ui-screen-checks", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator("#cgpt-code-helper-panel")).toBeVisible({ timeout: 10_000 });
  return page;
}

async function getServiceWorker(context) {
  return (
    context.serviceWorkers()[0] ||
    (await context.waitForEvent("serviceworker", { timeout: 20_000 }))
  );
}

async function readStorage(serviceWorker, areaName, keys) {
  return serviceWorker.evaluate(async ({ areaName, keys }) => {
    return new Promise((resolve) => {
      chrome.storage[areaName].get(keys, (result) => resolve(result));
    });
  }, { areaName, keys });
}

async function searchDownload(serviceWorker, downloadId) {
  return serviceWorker.evaluate(async (id) => {
    return new Promise((resolve) => {
      chrome.downloads.search({ id }, (items) => resolve(items && items.length ? items[0] : null));
    });
  }, downloadId);
}

async function waitForLatestApplyLog(serviceWorker) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const storageState = await readStorage(serviceWorker, "local", [
      LOG_STORAGE_KEY,
      PROJECT_FOLDER_STORAGE_KEY,
    ]);
    const logs = Array.isArray(storageState[LOG_STORAGE_KEY]) ? storageState[LOG_STORAGE_KEY] : [];
    const latestLog = logs[logs.length - 1];
    if (latestLog && latestLog.ok && typeof latestLog.downloadId === "number") {
      const download = await searchDownload(serviceWorker, latestLog.downloadId);
      if (download && download.state === "complete" && download.filename) {
        return { storageState, latestLog, download };
      }
    }
    await delay(250);
  }
  throw new Error("Timed out while waiting for a completed download log.");
}

async function saveMockCodeBlock(page) {
  const projectFolderInput = page.locator("input[placeholder='e.g. dev/my-project']");
  await projectFolderInput.fill("workspace");
  await page.getByRole("button", { name: "Set Folder" }).click();
  await expect(page.locator("#cgpt-helper-toast")).toContainText("Project folder saved: workspace");
  const saveButton = page.locator(
    "[data-cgpt-code-wrapper='1'] button[data-cgpt-button-role='save']"
  );
  await page.locator("[data-cgpt-code-wrapper='1']").hover();
  await saveButton.click();
}

test.describe("UI screen checks", () => {
  let sharedContext = null;

  test.beforeAll(async ({}, testInfo) => {
    const launchProbe = await createMockContext(testInfo);
    test.skip(!launchProbe.ok, launchProbe.reason);
    sharedContext = launchProbe.context;
  });

  test.afterAll(async () => {
    if (sharedContext) {
      await sharedContext.close().catch(() => {});
      sharedContext = null;
    }
  });

  test("main panel shows the current panel sections", async ({}, testInfo) => {
    test.setTimeout(120_000);
    const screenshotDir = path.join(artifactsRoot, "main-panel", "screenshots");
    await ensureDir(screenshotDir);
    const page = await createMockPage(sharedContext);
    try {
      const panel = page.locator("#cgpt-code-helper-panel");
      await expect(panel).toContainText("Extension");
      await expect(panel).toContainText("Project Folder");
      await expect(panel).toContainText("Save Options");
      await expect(panel).toContainText("Display");
      await expect(panel).toContainText("Display Actions");
      await expect(panel).toContainText("Logs");
      await panel.screenshot({ path: path.join(screenshotDir, "main-panel.png") });
    } finally {
      await page.close().catch(() => {});
    }
  });

  test("templates panel opens from the floating Templates button", async ({}, testInfo) => {
    const screenshotDir = path.join(artifactsRoot, "templates-panel", "screenshots");
    await ensureDir(screenshotDir);
    const page = await createMockPage(sharedContext);
    try {
      await page.getByRole("button", { name: "Templates" }).click();
      const panel = page.locator("#cgpt-helper-template-panel");
      await expect(panel).toBeVisible();
      await expect(panel).toContainText("Templates");
      await expect(panel).toContainText("Edit");
      await expect(panel).toContainText("Add");
      await expect(panel).toContainText("Insert");
      await panel.screenshot({ path: path.join(screenshotDir, "templates-panel.png") });
    } finally {
      await page.close().catch(() => {});
    }
  });

  test("download log modal opens after a save and shows the latest download entry", async ({}, testInfo) => {
    const screenshotDir = path.join(artifactsRoot, "download-log-modal", "screenshots");
    await ensureDir(screenshotDir);
    const serviceWorker = await getServiceWorker(sharedContext);
    const page = await createMockPage(sharedContext);
    try {
      await saveMockCodeBlock(page);
      await waitForLatestApplyLog(serviceWorker);
      await page.getByRole("button", { name: "Download Log" }).click();
      const modal = page.locator("#cgpt-helper-log-modal");
      await expect(modal).toBeVisible();
      await expect(modal).toContainText("Download Log");
      await expect(modal).toContainText("src/app.js");
      await expect(modal).toContainText("workspace/src/app.js");
      await modal.screenshot({ path: path.join(screenshotDir, "download-log-modal.png") });
    } finally {
      await page.close().catch(() => {});
    }
  });

  test("chat log modal opens and shows the message/code summary UI", async ({}, testInfo) => {
    const screenshotDir = path.join(artifactsRoot, "chat-log-modal", "screenshots");
    await ensureDir(screenshotDir);
    const page = await createMockPage(sharedContext);
    try {
      await page.getByRole("button", { name: "Chat Log" }).click();
      const modal = page.locator("#cgpt-helper-chatlog-modal");
      await expect(modal).toBeVisible();
      await expect(modal).toContainText("Chat Log");
      await expect(modal).toContainText("Save uses the project folder");
      await expect(modal).toContainText("Generate a tiny app file and keep the answer concise.");
      await expect(modal).toContainText("Code blocks (1)");
      await modal.screenshot({ path: path.join(screenshotDir, "chat-log-modal.png") });
    } finally {
      await page.close().catch(() => {});
    }
  });
});
