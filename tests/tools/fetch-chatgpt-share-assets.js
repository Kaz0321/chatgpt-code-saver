const fs = require("fs/promises");
const path = require("path");
const { chromium } = require("playwright");

const repoRoot = path.join(__dirname, "..", "..");
const artifactsRoot = path.join(repoRoot, "tests", "artifacts", "chatgpt-share-assets");

function resolveShareUrl() {
  const cliValue = process.argv[2];
  const envValue = process.env.CHATGPT_SHARE_URL;
  const rawValue = typeof cliValue === "string" && cliValue.trim()
    ? cliValue.trim()
    : typeof envValue === "string" && envValue.trim()
      ? envValue.trim()
      : "";

  if (!rawValue) {
    throw new Error("Provide a ChatGPT share URL as the first argument or CHATGPT_SHARE_URL.");
  }

  const shareUrl = new URL(rawValue);
  if (!/^https?:$/i.test(shareUrl.protocol)) {
    throw new Error(`Unsupported URL protocol: ${shareUrl.protocol}`);
  }
  return shareUrl;
}

function safeSlug(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "share";
}

function extractShareId(shareUrl) {
  const match = shareUrl.pathname.match(/\/share\/([a-z0-9-]+)/i);
  if (match && match[1]) {
    return match[1];
  }
  return safeSlug(shareUrl.pathname);
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function downloadStylesheets(stylesheetUrls, outputDir) {
  const cssDir = path.join(outputDir, "styles");
  await ensureDir(cssDir);

  const downloads = [];
  for (const [index, stylesheetUrl] of stylesheetUrls.entries()) {
    try {
      const response = await fetch(stylesheetUrl);
      const content = await response.text();
      const fileName = `${String(index + 1).padStart(2, "0")}-${safeSlug(path.basename(new URL(stylesheetUrl).pathname) || "style")}.css`;
      const outputPath = path.join(cssDir, fileName);
      await fs.writeFile(outputPath, content, "utf8");
      downloads.push({
        url: stylesheetUrl,
        ok: response.ok,
        status: response.status,
        file: path.relative(outputDir, outputPath).replace(/\\/g, "/"),
      });
    } catch (error) {
      downloads.push({
        url: stylesheetUrl,
        ok: false,
        status: 0,
        error: error.message,
      });
    }
  }

  return downloads;
}

async function collectShareAssets(shareUrl) {
  const shareId = extractShareId(shareUrl);
  const outputDir = path.join(artifactsRoot, shareId);
  await ensureDir(outputDir);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1600 } });

  try {
    await page.goto(String(shareUrl), {
      waitUntil: "networkidle",
      timeout: 120_000,
    });
    await page.waitForSelector("pre", { timeout: 120_000 }).catch(() => {});

    const stylesheetUrls = await page.$$eval('link[rel="stylesheet"]', (nodes) =>
      Array.from(new Set(nodes.map((node) => node.href).filter(Boolean)))
    );

    const snapshot = await page.evaluate(() => {
      const title = document.title || "";
      const html = document.documentElement.outerHTML || "";
      const firstPre = document.querySelector("pre");
      const codeBlocks = Array.from(document.querySelectorAll("pre")).slice(0, 5).map((pre, index) => {
        const shell = pre.firstElementChild || pre;
        const header = shell.querySelector(':scope > div:first-child');
        const divider = pre.querySelector(".bg-token-border-light");
        const host = pre.querySelector(".cm-scroller, code") || pre.querySelector("code");
        const code = pre.querySelector(".cm-content, code");
        const pick = (node) => {
          if (!node) return null;
          const style = getComputedStyle(node);
          return {
            tag: node.tagName,
            className: node.className,
            backgroundColor: style.backgroundColor,
            color: style.color,
            borderTopColor: style.borderTopColor,
            borderRadius: style.borderRadius,
            boxShadow: style.boxShadow,
          };
        };
        return {
          index,
          textPreview: (code?.textContent || "").slice(0, 160),
          outerHTML: pre.outerHTML,
          shell: pick(shell),
          header: pick(header),
          divider: pick(divider),
          host: pick(host),
          code: pick(code),
        };
      });

      return {
        title,
        html,
        codeBlockCount: document.querySelectorAll("pre").length,
        firstPreOuterHTML: firstPre ? firstPre.outerHTML : "",
        codeBlocks,
      };
    });

    const htmlPath = path.join(outputDir, "page.html");
    const firstCodeBlockPath = path.join(outputDir, "first-code-block.html");
    const screenshotPath = path.join(outputDir, "page.png");
    const metadataPath = path.join(outputDir, "metadata.json");

    await Promise.all([
      fs.writeFile(htmlPath, `${snapshot.html}\n`, "utf8"),
      fs.writeFile(firstCodeBlockPath, `${snapshot.firstPreOuterHTML || ""}\n`, "utf8"),
      page.screenshot({ path: screenshotPath, fullPage: true }),
    ]);

    const stylesheetDownloads = await downloadStylesheets(stylesheetUrls, outputDir);

    const metadata = {
      shareUrl: String(shareUrl),
      shareId,
      fetchedAt: new Date().toISOString(),
      title: snapshot.title,
      codeBlockCount: snapshot.codeBlockCount,
      files: {
        html: path.relative(repoRoot, htmlPath).replace(/\\/g, "/"),
        firstCodeBlockHtml: path.relative(repoRoot, firstCodeBlockPath).replace(/\\/g, "/"),
        screenshot: path.relative(repoRoot, screenshotPath).replace(/\\/g, "/"),
      },
      stylesheets: stylesheetDownloads,
      codeBlocks: snapshot.codeBlocks.map(({ outerHTML, ...rest }) => rest),
    };

    await writeJson(metadataPath, metadata);
    console.log(`Saved share assets to ${path.relative(repoRoot, outputDir).replace(/\\/g, "/")}`);
  } finally {
    await browser.close();
  }
}

collectShareAssets(resolveShareUrl()).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
