const fs = require("fs/promises");
const path = require("path");
const { expect } = require("@playwright/test");

async function loadFixtureHtml(fixturePath) {
  return fs.readFile(fixturePath, "utf8");
}

async function routeChatgptDocument(page, handler) {
  await page.route("https://chatgpt.com/**", async (route) => {
    const response = await handler(route, route.request());
    if (response) {
      await route.fulfill(response);
      return;
    }
    await route.fulfill({
      status: 204,
      contentType: "text/plain; charset=utf-8",
      body: "",
    });
  });
}

async function openStaticChatgptPage(page, url, html, options = {}) {
  await routeChatgptDocument(page, async (_route, request) => {
    if (options.documentOnly !== false && request.resourceType() !== "document") {
      return null;
    }
    return {
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: html,
    };
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  if (options.waitForPanel !== false) {
    await expect(page.locator("#cgpt-code-helper-panel")).toBeVisible({ timeout: 10_000 });
  }
  return page;
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

async function openSavedFixtureChatgptPage(page, url, fixture) {
  const html = await fs.readFile(fixture.htmlPath, "utf8");
  await routeChatgptDocument(page, async (_route, request) => {
    if (request.resourceType() === "document") {
      return {
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: html,
      };
    }

    const pathname = decodeURIComponent(new URL(request.url()).pathname);
    const marker = `/${fixture.assetsDirName}/`;
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex < 0) {
      return null;
    }

    const relativePath = pathname.slice(markerIndex + marker.length);
    const localPath = path.join(fixture.assetsDirPath, relativePath);
    try {
      const stat = await fs.stat(localPath);
      if (!stat.isFile()) return null;
    } catch {
      return null;
    }

    return {
      status: 200,
      contentType: contentTypeFor(localPath),
      body: await fs.readFile(localPath),
    };
  });

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#cgpt-code-helper-panel")).toBeVisible({ timeout: 10_000 });
  return page;
}

module.exports = {
  loadFixtureHtml,
  openStaticChatgptPage,
  openSavedFixtureChatgptPage,
};
