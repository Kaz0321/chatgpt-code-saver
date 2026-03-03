const fs = require("fs/promises");
const path = require("path");
const { test, expect, chromium } = require("@playwright/test");
const { probeExtensionContext } = require("../helpers/e2eEnvironment");
const { ensureArtifactDirs, writeJsonArtifact } = require("../helpers/e2eArtifacts");
const { loadFixtureHtml, openStaticChatgptPage } = require("../helpers/mockChatgptPage");

const repoRoot = path.join(__dirname, "..", "..");
const testsRoot = path.join(__dirname, "..");
const extensionPath = path.join(repoRoot, "extension");
const fixturePath = path.join(testsRoot, "fixtures", "chatgpt-share-code-blocks.html");
const artifactsRoot = path.join(testsRoot, "artifacts", "chatgpt-share-code-blocks-offline");

test("chat log shows fenced code blocks from a shared-style page with generated names", async () => {
  const screenshotDir = path.join(artifactsRoot, "shared-code-blocks", "screenshots");
  const stateDir = path.join(artifactsRoot, "shared-code-blocks", "state");
  const profileBaseDir = path.join(artifactsRoot, "shared-code-blocks", "profiles");
  await ensureArtifactDirs(screenshotDir, stateDir, profileBaseDir);

  const profileDir = await fs.mkdtemp(path.join(profileBaseDir, "run-"));
  const launchProbe = await probeExtensionContext({
    chromium,
    profileDir,
    extensionPath,
  });
  test.skip(!launchProbe.ok, launchProbe.reason);
  const context = launchProbe.context;

  try {
    const html = await loadFixtureHtml(fixturePath);
    const page = await context.newPage();
    await openStaticChatgptPage(page, "https://chatgpt.com/share/offline-code-blocks", html, {
      documentOnly: false,
    });

    await page.getByRole("button", { name: "Chat Log" }).click();
    const modal = page.locator("#cgpt-helper-chatlog-modal");
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("Code blocks (5)");
    await expect(modal).toContainText("python-block-1.py");
    await expect(modal).toContainText("javascript-block-2.js");
    await expect(modal).toContainText("c-block-3.c");
    await expect(modal).toContainText("java-block-4.java");
    await expect(modal).toContainText("powershell-block-5.ps1");

    const saveButtonsEnabled = await modal.evaluate(() => {
      const codeSection = Array.from(document.querySelectorAll("#cgpt-helper-chatlog-modal button"))
        .filter((button) => button.textContent && button.textContent.trim() === "Save");
      return codeSection.every((button) => !button.disabled);
    });
    expect(saveButtonsEnabled).toBe(true);

    const state = await modal.evaluate((element) => {
      return {
        text: element.textContent || "",
      };
    });

    await Promise.all([
      page.screenshot({
        path: path.join(screenshotDir, "shared-code-blocks-chat-log.png"),
        fullPage: true,
      }),
      writeJsonArtifact(path.join(stateDir, "shared-code-blocks-chat-log.json"), state),
    ]);
  } finally {
    await context.close();
  }
});
