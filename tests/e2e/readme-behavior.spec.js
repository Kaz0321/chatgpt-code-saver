const fs = require("fs/promises");
const path = require("path");
const { test, expect, chromium } = require("@playwright/test");
const { getBrowserLaunchEnv } = require("../helpers/browserLaunchEnv");

const repoRoot = path.join(__dirname, "..", "..");
const testsRoot = path.join(__dirname, "..");
const extensionPath = path.join(repoRoot, "extension");
const artifactsRoot = path.join(testsRoot, "artifacts", "readme-behavior");
const fixturePath = path.join(testsRoot, "fixtures", "chatgpt-mock.html");

const LOG_STORAGE_KEY = "cgptHelper.logs";
const PROJECT_FOLDER_STORAGE_KEY = "cgptProjectFolderPath";

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function readStorage(serviceWorker, areaName, keys) {
  return serviceWorker.evaluate(async ({ areaName, keys }) => {
    return new Promise((resolve) => {
      chrome.storage[areaName].get(keys, (result) => {
        resolve(result);
      });
    });
  }, { areaName, keys });
}

async function searchDownload(serviceWorker, downloadId) {
  return serviceWorker.evaluate(async (id) => {
    return new Promise((resolve) => {
      chrome.downloads.search({ id }, (items) => {
        resolve(items && items.length ? items[0] : null);
      });
    });
  }, downloadId);
}

async function waitForLatestApplyLog(serviceWorker) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const storageState = await readStorage(serviceWorker, "local", [
      LOG_STORAGE_KEY,
      PROJECT_FOLDER_STORAGE_KEY,
    ]);
    const logs = Array.isArray(storageState[LOG_STORAGE_KEY])
      ? storageState[LOG_STORAGE_KEY]
      : [];
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

test("verifies README workflow on a mocked ChatGPT page", async () => {
  test.setTimeout(120_000);

  const domDir = path.join(artifactsRoot, "dom");
  const screenshotDir = path.join(artifactsRoot, "screenshots");
  const stateDir = path.join(artifactsRoot, "state");
  const traceDir = path.join(artifactsRoot, "traces");
  const profileBaseDir = path.join(artifactsRoot, "profiles");

  await Promise.all([
    ensureDir(domDir),
    ensureDir(screenshotDir),
    ensureDir(stateDir),
    ensureDir(traceDir),
    ensureDir(profileBaseDir),
  ]);

  const profileDir = await fs.mkdtemp(path.join(profileBaseDir, "run-"));

  const fixtureHtml = await fs.readFile(fixturePath, "utf8");
  const context = await chromium.launchPersistentContext(profileDir, {
    channel: "chromium",
    headless: true,
    env: getBrowserLaunchEnv(),
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
    await page.route("https://chatgpt.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: fixtureHtml,
      });
    });

    await page.goto("https://chatgpt.com/c/readme-smoke", {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("#cgpt-code-helper-panel")).toBeVisible({ timeout: 10_000 });
    const initialLayout = await page.evaluate(() => {
      const main = document.querySelector("main");
      const panel = document.getElementById("cgpt-code-helper-panel");
      if (!main || !panel) {
        return null;
      }

      const mainRect = main.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      return {
        mainRight: mainRect.right,
        panelLeft: panelRect.left,
        marginRight: window.getComputedStyle(main).marginRight,
        paddingBottom: window.getComputedStyle(main).paddingBottom,
      };
    });
    expect(initialLayout).toBeTruthy();
    expect(initialLayout.mainRight).toBeLessThanOrEqual(initialLayout.panelLeft - 8);
    const saveButton = page.locator(
      "[data-cgpt-code-wrapper='1'] button[data-cgpt-button-role='save']"
    );
    await expect(saveButton).toHaveCount(1);
    await page.locator("[data-cgpt-code-wrapper='1']").hover();
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();

    await page.getByRole("button", { name: "Templates" }).click();
    await expect(page.locator("#cgpt-helper-template-panel")).toBeVisible();
    await page.locator("#cgpt-helper-template-panel").getByRole("button", { name: "Insert" }).click();
    await expect(page.locator("textarea[data-testid='textbox']")).toHaveValue(/\/\/ 出力ルール/);

    const projectFolderInput = page.locator("input[placeholder='e.g. dev/my-project']");
    await projectFolderInput.fill("workspace");
    await page.getByRole("button", { name: "Set Folder" }).click();
    await expect(page.locator("#cgpt-helper-toast")).toContainText("Project folder saved: workspace");

    const stripLabel = page.locator("label", {
      hasText: "Remove the first file: line when saving",
    });
    await stripLabel.locator("input[type='checkbox']").check();

    await page.locator("[data-cgpt-code-wrapper='1']").hover();
    await saveButton.click();

    const { storageState, latestLog, download } = await waitForLatestApplyLog(serviceWorker);
    const downloadedContent = await fs.readFile(download.filename, "utf8");

    expect(storageState[PROJECT_FOLDER_STORAGE_KEY]).toBe("workspace");
    expect(latestLog.filePathRelative).toBe("src/app.js");
    expect(latestLog.filePath).toBe("workspace/src/app.js");
    expect(downloadedContent).toBe('console.log("hello from mock");\n');

    await page.getByRole("button", { name: "Save Log" }).first().click();
    await expect(page.locator("#cgpt-helper-log-modal")).toBeVisible();
    await expect(page.locator("#cgpt-helper-log-modal")).toContainText("src/app.js");
    await expect(page.locator("#cgpt-helper-log-modal")).toContainText("workspace/src/app.js");

    await page.locator("#cgpt-helper-log-modal").getByRole("button", { name: "Close" }).click();

    await page.getByRole("button", { name: "Chat Log" }).click();
    await expect(page.locator("#cgpt-helper-chatlog-modal")).toBeVisible();
    await expect(page.locator("#cgpt-helper-chatlog-modal")).toContainText(
      "Generate a tiny app file and keep the answer concise."
    );
    await expect(page.locator("#cgpt-helper-chatlog-modal")).toContainText("Code blocks (1)");
    await expect(page.locator("#cgpt-helper-chatlog-modal")).toContainText("src/app.js");

    await Promise.all([
      page.screenshot({
        path: path.join(screenshotDir, "readme-workflow.png"),
        fullPage: true,
      }),
      fs.writeFile(path.join(domDir, "page.html"), await page.content(), "utf8"),
      writeJson(path.join(stateDir, "storage.json"), storageState),
      writeJson(path.join(stateDir, "latest-log.json"), latestLog),
      writeJson(path.join(stateDir, "download.json"), download),
      fs.writeFile(path.join(stateDir, "downloaded-content.txt"), downloadedContent, "utf8"),
    ]);
  } finally {
    await context.tracing.stop({ path: path.join(traceDir, "trace.zip") });
    await context.close();
  }
});
