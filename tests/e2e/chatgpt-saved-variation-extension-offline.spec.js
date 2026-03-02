const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { test, expect, chromium } = require("@playwright/test");
const { probeExtensionContext } = require("../helpers/e2eEnvironment");

const repoRoot = path.join(__dirname, "..", "..");
const testsRoot = path.join(__dirname, "..");
const extensionPath = path.join(repoRoot, "extension");
const artifactsRoot = path.join(testsRoot, "artifacts", "chatgpt-saved-variation-extension-offline");

async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

function findSavedVariationFixture() {
  const htmlFileName = fs
    .readdirSync(repoRoot)
    .find((name) => name.endsWith(".html") && fs.readFileSync(path.join(repoRoot, name), "utf8").includes("見出し6"));

  if (!htmlFileName) {
    return null;
  }

  const assetsDirName = fs
    .readdirSync(repoRoot)
    .find((name) => name.endsWith("_files") && fs.existsSync(path.join(repoRoot, name)));

  if (!assetsDirName) {
    return null;
  }

  return {
    htmlPath: path.join(repoRoot, htmlFileName),
    assetsDirPath: path.join(repoRoot, assetsDirName),
    assetsDirName,
  };
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  return "application/octet-stream";
}

test("replays saved variation page and keeps heading levels 4-6 visible", async () => {
  const fixture = findSavedVariationFixture();
  test.skip(!fixture, "Saved variation HTML fixture was not found in the repository root.");

  const scenarioDir = path.join(artifactsRoot, "saved-variation");
  const screenshotDir = path.join(scenarioDir, "screenshots");
  const stateDir = path.join(scenarioDir, "state");
  const traceDir = path.join(scenarioDir, "traces");
  const profileBaseDir = path.join(scenarioDir, "profiles");

  await Promise.all([
    ensureDir(screenshotDir),
    ensureDir(stateDir),
    ensureDir(traceDir),
    ensureDir(profileBaseDir),
  ]);

  const profileDir = await fsp.mkdtemp(path.join(profileBaseDir, "run-"));
  const html = await fsp.readFile(fixture.htmlPath, "utf8");

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

    await page.route("https://chatgpt.com/**", async (route) => {
      const request = route.request();
      if (request.resourceType() === "document") {
        await route.fulfill({
          status: 200,
          contentType: "text/html; charset=utf-8",
          body: html,
        });
        return;
      }

      const pathname = decodeURIComponent(new URL(request.url()).pathname);
      const marker = `/${fixture.assetsDirName}/`;
      const markerIndex = pathname.indexOf(marker);
      if (markerIndex >= 0) {
        const relativePath = pathname.slice(markerIndex + marker.length);
        const localPath = path.join(fixture.assetsDirPath, relativePath);
        if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
          await route.fulfill({
            status: 200,
            contentType: contentTypeFor(localPath),
            body: await fsp.readFile(localPath),
          });
          return;
        }
      }

      await route.fulfill({
        status: 204,
        contentType: "text/plain; charset=utf-8",
        body: "",
      });
    });

    await page.goto("https://chatgpt.com/c/offline-saved-variation", {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("#cgpt-code-helper-panel")).toBeVisible();

    const targetMessage = page
      .locator("[data-message-author-role='assistant']")
      .filter({ hasText: "見出し6" })
      .last();

    await expect(targetMessage).toBeVisible();
    await expect(targetMessage.locator(".cgpt-helper-heading-title", { hasText: "見出し4" })).toBeVisible();
    await expect(targetMessage.locator(".cgpt-helper-heading-title", { hasText: "見出し5" })).toBeVisible();
    await expect(targetMessage.locator(".cgpt-helper-heading-title", { hasText: "見出し6" })).toBeVisible();

    const visibilityState = await targetMessage.evaluate((element) => {
      const getHeadingState = (title) => {
        const node = Array.from(
          element.querySelectorAll(".cgpt-helper-heading-title")
        ).find((candidate) => candidate.textContent?.trim() === title);

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
      fsp.writeFile(
        path.join(stateDir, "visibility.json"),
        `${JSON.stringify(visibilityState, null, 2)}\n`,
        "utf8"
      ),
    ]);
  } finally {
    await context.tracing.stop({ path: path.join(traceDir, "trace.zip") });
    await context.close();
  }
});
