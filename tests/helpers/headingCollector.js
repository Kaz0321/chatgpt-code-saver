const fs = require("fs/promises");
const path = require("path");
const { expect } = require("@playwright/test");

const artifactsRoot = path.join(__dirname, "..", "artifacts", "heading-collection");
const fixtureRoot = path.join(__dirname, "..", "fixtures", "live-heading-variations");
const manifestPath = path.join(fixtureRoot, "manifest.json");

const scenarios = [
  {
    id: "h1-h3-basic",
    label: "H1 to H3",
    prompt: [
      "Markdown本文のみで回答してください。",
      "# Overview",
      "短い説明を1文。",
      "## Details",
      "短い説明を1文。",
      "### Notes",
      "短い説明を1文。",
    ].join("\n"),
  },
  {
    id: "starts-at-h2",
    label: "Starts At H2",
    prompt: [
      "Markdown本文のみで回答してください。",
      "# は使わず、次の見出しだけをこの順で出してください。",
      "## Overview",
      "短い説明を1文。",
      "### Details",
      "短い説明を1文。",
      "### Risks",
      "短い説明を1文。",
    ].join("\n"),
  },
  {
    id: "skipped-levels",
    label: "Skipped Levels",
    prompt: [
      "Markdown本文のみで回答してください。",
      "次の見出しをこの順で出してください。",
      "## Parent",
      "短い説明を1文。",
      "#### Deep child",
      "短い説明を1文。",
      "### Middle child",
      "短い説明を1文。",
    ].join("\n"),
  },
  {
    id: "deep-h1-h6",
    label: "H1 to H6",
    prompt: [
      "Markdown本文のみで回答してください。",
      "以下の見出しを順番どおりにすべて使ってください。",
      "# L1",
      "## L2",
      "### L3",
      "#### L4",
      "##### L5",
      "###### L6",
      "各見出しの下に1文ずつ付けてください。",
    ].join("\n"),
  },
  {
    id: "h2-siblings",
    label: "H2 Siblings",
    prompt: [
      "Markdown本文のみで回答してください。",
      "以下の見出しをこの順で出してください。",
      "## Alpha",
      "短い説明を1文。",
      "## Beta",
      "短い説明を1文。",
      "## Gamma",
      "短い説明を1文。",
    ].join("\n"),
  },
  {
    id: "mixed-headings-and-code",
    label: "Mixed Content",
    prompt: [
      "Markdown本文のみで回答してください。",
      "以下の構造で出力してください。",
      "## Plan",
      "短い導入文を1文。",
      "### Step 1",
      "箇条書きを2個。",
      "### Step 2",
      "短いJavaScriptコードブロックを1つ。",
    ].join("\n"),
  },
];

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function sortScenarioResults(results) {
  const scenarioOrder = new Map(scenarios.map((scenario, index) => [scenario.id, index]));
  return [...results].sort((left, right) => {
    const leftIndex = scenarioOrder.has(left.id) ? scenarioOrder.get(left.id) : Number.MAX_SAFE_INTEGER;
    const rightIndex = scenarioOrder.has(right.id) ? scenarioOrder.get(right.id) : Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex;
  });
}

async function writeManifest(results, { mergeExisting = true } = {}) {
  let mergedResults = results;

  if (mergeExisting) {
    try {
      const current = JSON.parse(await fs.readFile(manifestPath, "utf8"));
      const byId = new Map(
        Array.isArray(current.scenarios)
          ? current.scenarios.map((scenario) => [scenario.id, scenario])
          : []
      );
      results.forEach((scenario) => byId.set(scenario.id, scenario));
      mergedResults = sortScenarioResults(Array.from(byId.values()));
    } catch (error) {
      if (error && error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  await fs.writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        collectedAt: new Date().toISOString(),
        source: "chatgpt.com",
        scenarios: mergedResults,
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  return mergedResults;
}

function safeSlug(value) {
  return String(value || "")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

async function waitForChatInput(page, timeoutMs = 10 * 60 * 1000) {
  const selectors = [
    "#prompt-textarea[contenteditable='true']",
    "div[contenteditable='true'][data-testid='textbox']",
    "div[contenteditable='true'][role='textbox']",
    "div[contenteditable='true']",
    "textarea[name='prompt-textarea']",
    "textarea[data-testid='chat-input']",
    "textarea",
  ];
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const selector of selectors) {
      const locator = page.locator(selector);
      const count = await locator.count();
      for (let index = 0; index < count; index += 1) {
        const candidate = locator.nth(index);
        if (await candidate.isVisible()) {
          return candidate;
        }
      }
    }
    await page.waitForTimeout(1000);
  }
  throw new Error("Timed out waiting for the ChatGPT composer.");
}

async function fillComposer(page, composer, text) {
  const tagName = await composer.evaluate((element) => element.tagName);
  if (tagName === "TEXTAREA") {
    await composer.evaluate((element, value) => {
      const prototype = Object.getPrototypeOf(element);
      const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
      element.focus();
      if (descriptor && typeof descriptor.set === "function") {
        descriptor.set.call(element, String(value || ""));
      } else {
        element.value = String(value || "");
      }
      element.dispatchEvent(new InputEvent("input", { bubbles: true, data: String(value || ""), inputType: "insertText" }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }, text);
    return;
  }
  await composer.click();
  await composer.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await composer.press("Backspace");
  await page.keyboard.insertText(String(text || ""));
}

async function submitPrompt(page, prompt) {
  const composer = await waitForChatInput(page);
  const assistantLocator = page.locator("[data-message-author-role='assistant']");
  const previousCount = await assistantLocator.count();
  await fillComposer(page, composer, prompt);

  const sendSelectors = [
    "button[data-testid='send-button']",
    "button[aria-label*='Send']",
    "button[aria-label*='送信']",
  ];

  let submitted = false;
  for (const selector of sendSelectors) {
    const button = page.locator(selector).last();
    if ((await button.count()) && (await button.isVisible()) && (await button.isEnabled())) {
      await button.click();
      submitted = true;
      break;
    }
  }
  if (!submitted) {
    await composer.press("Enter");
  }

  await expect
    .poll(async () => assistantLocator.count(), { timeout: 120_000 })
    .toBeGreaterThan(previousCount);

  await expect
    .poll(async () => {
      const count = await assistantLocator.count();
      if (!count) {
        return 0;
      }
      const text = await assistantLocator.nth(count - 1).innerText().catch(() => "");
      return text.trim().length;
    }, { timeout: 120_000 })
    .toBeGreaterThan(0);

  const targetAssistant = assistantLocator.nth((await assistantLocator.count()) - 1);
  await waitForAssistantToSettle(page, targetAssistant);
  return targetAssistant;
}

async function waitForAssistantToSettle(page, locator) {
  let lastText = "";
  let stableTicks = 0;
  const handle = await locator.elementHandle();
  for (let attempt = 0; attempt < 180; attempt += 1) {
    const currentText = (await page.evaluate(
      (element) => (element ? (element.innerText || element.textContent || "") : ""),
      handle
    )).trim();
    if (currentText && currentText === lastText) {
      stableTicks += 1;
    } else {
      stableTicks = 0;
    }
    lastText = currentText;
    if (stableTicks >= 3) {
      return;
    }
    await page.waitForTimeout(1000);
  }
  if (lastText) {
    return;
  }
  throw new Error("Timed out waiting for the assistant response to settle.");
}

async function collectScenarioResult(locator) {
  return locator.evaluate((element) => {
    const headings = Array.from(element.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((heading) => ({
      tagName: heading.tagName.toLowerCase(),
      text: (heading.textContent || "").trim(),
    }));
    return {
      innerHTML: element.innerHTML,
      outerHTML: element.outerHTML,
      text: element.innerText || element.textContent || "",
      headings,
      codeBlockCount: element.querySelectorAll("pre code").length,
      linkCount: element.querySelectorAll("a[href]").length,
    };
  });
}

async function runHeadingCollection(page, selectedScenarios = scenarios) {
  const screenshotDir = path.join(artifactsRoot, "screenshots");
  const stateDir = path.join(artifactsRoot, "state");

  await Promise.all([ensureDir(screenshotDir), ensureDir(stateDir), ensureDir(fixtureRoot)]);
  const results = [];

  for (const scenario of selectedScenarios) {
    console.log(`Running heading collection scenario: ${scenario.id}`);
    const assistantLocator = await submitPrompt(page, scenario.prompt);
    const result = await collectScenarioResult(assistantLocator);
    const htmlFileName = `${safeSlug(scenario.id)}.html`;

    await Promise.all([
      fs.writeFile(path.join(fixtureRoot, htmlFileName), `${result.innerHTML}\n`, "utf8"),
      page.screenshot({
        path: path.join(screenshotDir, `${safeSlug(scenario.id)}.png`),
        fullPage: true,
      }),
      fs.writeFile(
        path.join(stateDir, `${safeSlug(scenario.id)}.json`),
        `${JSON.stringify({ scenario, result }, null, 2)}\n`,
        "utf8"
      ),
    ]);

    results.push({
      id: scenario.id,
      label: scenario.label,
      prompt: scenario.prompt,
      responseHtmlFile: htmlFileName,
      headings: result.headings,
      codeBlockCount: result.codeBlockCount,
      linkCount: result.linkCount,
      textPreview: result.text.slice(0, 400),
    });

    await page.waitForTimeout(1500);
  }

  await writeManifest(results, { mergeExisting: true });

  return results;
}

module.exports = {
  artifactsRoot,
  fixtureRoot,
  manifestPath,
  scenarios,
  ensureDir,
  writeManifest,
  runHeadingCollection,
};
