const fs = require("fs/promises");
const path = require("path");
const assert = require("node:assert/strict");
const { test, expect } = require("@playwright/test");
const { probeExtensionContext } = require("../helpers/e2eEnvironment");

const repoRoot = path.join(__dirname, "..", "..");
const testsRoot = path.join(__dirname, "..");
const extensionPath = path.join(repoRoot, "extension");
const fixturePath = path.join(repoRoot, "チャット内表現バリエーション.html");
const artifactsRoot = path.join(testsRoot, "artifacts", "chatgpt-variation-extension-offline");

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readVariationCoverage(page) {
  return page.evaluate(() => {
    const codeBlocks = Array.from(document.querySelectorAll("pre"));
    const missing = codeBlocks
      .map((pre, index) => {
        const wrapper = pre.closest("[data-cgpt-code-wrapper='1']");
        const saveButton =
          pre.querySelector("button[data-cgpt-button-role='save']") ||
          wrapper?.querySelector("button[data-cgpt-button-role='save']");

        return {
          index,
          hasWrapper: Boolean(wrapper),
          hasSaveButton: Boolean(saveButton),
          preview: (pre.innerText || pre.textContent || "")
            .trim()
            .split("\n")
            .slice(0, 3)
            .join(" | ")
            .slice(0, 200),
        };
      })
      .filter((block) => !block.hasSaveButton);

    return {
      preCount: codeBlocks.length,
      saveButtonCount: document.querySelectorAll("button[data-cgpt-button-role='save']").length,
      missing,
    };
  });
}

test("adds save buttons to all code blocks in the variation fixture", async ({ browserName, playwright }) => {
  test.skip(browserName !== "chromium", "Extension coverage requires Chromium.");
  test.setTimeout(120_000);

  const screenshotDir = path.join(artifactsRoot, "screenshots");
  const stateDir = path.join(artifactsRoot, "state");
  const profileBaseDir = path.join(artifactsRoot, "profiles");

  await Promise.all([
    ensureDir(screenshotDir),
    ensureDir(stateDir),
    ensureDir(profileBaseDir),
  ]);

  const fixtureHtml = await fs.readFile(fixturePath, "utf8");
  const profileDir = await fs.mkdtemp(path.join(profileBaseDir, "run-"));

  const launchProbe = await probeExtensionContext({
    chromium: playwright.chromium,
    profileDir,
    extensionPath,
  });
  test.skip(!launchProbe.ok, launchProbe.reason);
  const context = launchProbe.context;

  try {
    const page = await context.newPage();
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
        body: fixtureHtml,
      });
    });

    await page.goto("https://chatgpt.com/c/variation-fixture", {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("#cgpt-code-helper-panel")).toBeVisible();

    await expect
      .poll(async () => {
        const result = await readVariationCoverage(page);
        return result.missing.length;
      })
      .toBe(0);

    const result = await readVariationCoverage(page);

    await Promise.all([
      page.screenshot({
        path: path.join(screenshotDir, "variation-fixture.png"),
        fullPage: true,
      }),
      fs.writeFile(
        path.join(stateDir, "variation-result.json"),
        `${JSON.stringify(result, null, 2)}\n`,
        "utf8"
      ),
    ]);

    assert.deepStrictEqual(result.missing, []);
  } finally {
    await context.close();
  }
});
