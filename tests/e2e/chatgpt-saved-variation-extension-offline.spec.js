const fsp = require("fs/promises");
const path = require("path");
const { test, expect, chromium } = require("@playwright/test");
const { probeExtensionContext } = require("../helpers/e2eEnvironment");
const { ensureArtifactDirs, writeJsonArtifact } = require("../helpers/e2eArtifacts");
const { openSavedFixtureChatgptPage } = require("../helpers/mockChatgptPage");
const { getSavedVariationFixture } = require("../helpers/savedVariationFixture");

const repoRoot = path.join(__dirname, "..", "..");
const testsRoot = path.join(__dirname, "..");
const extensionPath = path.join(repoRoot, "extension");
const artifactsRoot = path.join(testsRoot, "artifacts", "chatgpt-saved-variation-extension-offline");

test("replays saved variation page and keeps heading levels 4-6 visible", async () => {
  const fixture = getSavedVariationFixture();
  test.skip(!fixture, "Saved variation HTML fixture was not found under tests/fixtures/saved-variation.");

  const scenarioDir = path.join(artifactsRoot, "saved-variation");
  const screenshotDir = path.join(scenarioDir, "screenshots");
  const stateDir = path.join(scenarioDir, "state");
  const traceDir = path.join(scenarioDir, "traces");
  const profileBaseDir = path.join(scenarioDir, "profiles");
  await ensureArtifactDirs(screenshotDir, stateDir, traceDir, profileBaseDir);

  const profileDir = await fsp.mkdtemp(path.join(profileBaseDir, "run-"));
  const launchProbe = await probeExtensionContext({
    chromium,
    profileDir,
    extensionPath,
  });
  test.skip(!launchProbe.ok, launchProbe.reason);
  const context = launchProbe.context;

  try {
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const page = await context.newPage();
    await openSavedFixtureChatgptPage(page, "https://chatgpt.com/c/offline-saved-variation", fixture);

    const targetMessage = page
      .locator("[data-message-author-role='assistant']")
      .filter({ has: page.locator("h4, h5, h6") })
      .last();

    await expect(targetMessage).toBeVisible();
    await expect(targetMessage.locator(".cgpt-helper-heading-title", { hasText: "見出し4" })).toBeVisible();
    await expect(targetMessage.locator(".cgpt-helper-heading-title", { hasText: "見出し5" })).toBeVisible();
    await expect(targetMessage.locator(".cgpt-helper-heading-title", { hasText: "見出し6" })).toBeVisible();

    const visibilityState = await targetMessage.evaluate((element) => {
      const getHeadingState = (title) => {
        const node = Array.from(element.querySelectorAll(".cgpt-helper-heading-title")).find(
          (candidate) => candidate.textContent?.trim() === title
        );
        if (!node) {
          return null;
        }
        const rect = node.getBoundingClientRect();
        return {
          title,
          width: rect.width,
          height: rect.height,
        };
      };

      return {
        heading4: getHeadingState("見出し4"),
        heading5: getHeadingState("見出し5"),
        heading6: getHeadingState("見出し6"),
      };
    });

    expect(visibilityState.heading4?.height).toBeGreaterThan(0);
    expect(visibilityState.heading5?.height).toBeGreaterThan(0);
    expect(visibilityState.heading6?.height).toBeGreaterThan(0);

    await Promise.all([
      page.screenshot({
        path: path.join(screenshotDir, "saved-variation.png"),
        fullPage: true,
      }),
      writeJsonArtifact(path.join(stateDir, "visibility.json"), visibilityState),
    ]);
  } finally {
    await context.tracing.stop({ path: path.join(traceDir, "trace.zip") }).catch(() => {});
    await context.close();
  }
});

test("keeps timestamp headers separated from body and actions in a constrained viewport", async () => {
  const fixture = getSavedVariationFixture();
  test.skip(!fixture, "Saved variation HTML fixture was not found under tests/fixtures/saved-variation.");

  const scenarioDir = path.join(artifactsRoot, "saved-variation-layout");
  const screenshotDir = path.join(scenarioDir, "screenshots");
  const stateDir = path.join(scenarioDir, "state");
  const profileBaseDir = path.join(scenarioDir, "profiles");
  await ensureArtifactDirs(screenshotDir, stateDir, profileBaseDir);

  const profileDir = await fsp.mkdtemp(path.join(profileBaseDir, "run-"));
  const launchProbe = await probeExtensionContext({
    chromium,
    profileDir,
    extensionPath,
  });
  test.skip(!launchProbe.ok, launchProbe.reason);
  const context = launchProbe.context;

  try {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 960 });
    await openSavedFixtureChatgptPage(page, "https://chatgpt.com/c/offline-saved-variation", fixture);

    const firstAssistant = page.locator("[data-message-author-role='assistant']").first();
    await expect(firstAssistant.locator(".cgpt-helper-chatlog-timestamp-label")).toBeVisible();

    const layoutState = await firstAssistant.evaluate((element) => {
      const header = element.querySelector(".cgpt-helper-fold-header");
      const body = element.querySelector(".cgpt-helper-fold-body");
      const title = element.querySelector(".cgpt-helper-fold-title");
      const actions = element.querySelector(".cgpt-helper-fold-actions");
      const timestamp = element.querySelector(".cgpt-helper-chatlog-timestamp-wrapper");
      const rect = (node) => (node ? node.getBoundingClientRect() : null);

      const headerRect = rect(header);
      const bodyRect = rect(body);
      const titleRect = rect(title);
      const actionsRect = rect(actions);
      const timestampRect = rect(timestamp);

      return {
        headerBottom: headerRect ? headerRect.bottom : null,
        bodyTop: bodyRect ? bodyRect.top : null,
        titleRight: titleRect ? titleRect.right : null,
        actionsLeft: actionsRect ? actionsRect.left : null,
        timestampBottom: timestampRect ? timestampRect.bottom : null,
        titleBottom: titleRect ? titleRect.bottom : null,
        headerWidth: headerRect ? headerRect.width : null,
        titleWidth: titleRect ? titleRect.width : null,
        actionsWidth: actionsRect ? actionsRect.width : null,
        timestampText: timestamp ? timestamp.textContent.trim() : "",
      };
    });

    expect(layoutState.timestampText).toMatch(/\d/);
    expect(layoutState.timestampText).toContain(":");
    expect(layoutState.bodyTop).toBeGreaterThanOrEqual(layoutState.headerBottom);
    expect(layoutState.timestampBottom).toBeLessThanOrEqual(layoutState.headerBottom);
    expect(layoutState.titleWidth).toBeLessThanOrEqual(layoutState.headerWidth);
    expect(layoutState.actionsWidth).toBeLessThanOrEqual(layoutState.headerWidth);

    if (layoutState.titleBottom <= layoutState.headerBottom - 1) {
      expect(layoutState.titleRight).toBeLessThanOrEqual(layoutState.actionsLeft);
    }

    await Promise.all([
      page.screenshot({
        path: path.join(screenshotDir, "saved-variation-layout.png"),
        fullPage: true,
      }),
      writeJsonArtifact(path.join(stateDir, "layout.json"), layoutState),
    ]);
  } finally {
    await context.close();
  }
});
