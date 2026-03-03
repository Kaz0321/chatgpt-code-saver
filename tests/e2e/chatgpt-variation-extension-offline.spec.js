const fs = require("fs/promises");
const path = require("path");
const assert = require("node:assert/strict");
const { test, expect } = require("@playwright/test");
const { probeExtensionContext } = require("../helpers/e2eEnvironment");
const { ensureArtifactDirs, writeJsonArtifact } = require("../helpers/e2eArtifacts");
const { loadFixtureHtml, openStaticChatgptPage } = require("../helpers/mockChatgptPage");
const { getSavedVariationFixture } = require("../helpers/savedVariationFixture");

const repoRoot = path.join(__dirname, "..", "..");
const testsRoot = path.join(__dirname, "..");
const extensionPath = path.join(repoRoot, "extension");
const artifactsRoot = path.join(testsRoot, "artifacts", "chatgpt-variation-extension-offline");

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
  test.setTimeout(240_000);

  const fixture = getSavedVariationFixture();
  test.skip(!fixture, "Saved variation fixture was not found under tests/fixtures/saved-variation.");

  const screenshotDir = path.join(artifactsRoot, "screenshots");
  const stateDir = path.join(artifactsRoot, "state");
  const profileBaseDir = path.join(artifactsRoot, "profiles");
  await ensureArtifactDirs(screenshotDir, stateDir, profileBaseDir);

  const fixtureHtml = await loadFixtureHtml(fixture.htmlPath);
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
    await openStaticChatgptPage(page, "https://chatgpt.com/c/variation-fixture", fixtureHtml);

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
      writeJsonArtifact(path.join(stateDir, "variation-result.json"), result),
    ]);

    assert.deepStrictEqual(result.missing, []);
  } finally {
    await context.close();
  }
});
