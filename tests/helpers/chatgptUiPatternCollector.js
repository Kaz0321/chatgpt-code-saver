const fs = require("fs/promises");
const path = require("path");
const { expect } = require("@playwright/test");

const artifactsRoot = path.join(__dirname, "..", "artifacts", "chatgpt-ui-patterns");
const fixtureRoot = path.join(__dirname, "..", "fixtures", "live-ui-patterns");

const scenarios = [
  {
    id: "headings-h1-h6",
    label: "Headings H1-H6",
    prompt: [
      "Markdown本文のみで回答してください。",
      "次の見出しをこの順番で必ずすべて使ってください。",
      "# Level 1",
      "## Level 2",
      "### Level 3",
      "#### Level 4",
      "##### Level 5",
      "###### Level 6",
      "各見出しの下に1文ずつ書いてください。",
    ].join("\n"),
    expects: {
      headingTagsExact: ["h1", "h2", "h3", "h4", "h5", "h6"],
      minCounts: {
        paragraphCount: 6,
      },
    },
  },
  {
    id: "headings-starts-at-h2",
    label: "Headings Start At H2",
    prompt: [
      "Markdown本文のみで回答してください。",
      "# は使わず、次の見出しをこの順番で必ず使ってください。",
      "## Overview",
      "1文。",
      "### Details",
      "1文。",
      "### Risks",
      "1文。",
    ].join("\n"),
    expects: {
      headingTagsExact: ["h2", "h3", "h3"],
      minCounts: {
        paragraphCount: 3,
      },
    },
  },
  {
    id: "headings-skipped-levels",
    label: "Headings Skipped Levels",
    prompt: [
      "Markdown本文のみで回答してください。",
      "次の見出しをこの順番で必ず使ってください。",
      "## Parent",
      "1文。",
      "#### Deep Child",
      "1文。",
      "### Middle Child",
      "1文。",
    ].join("\n"),
    expects: {
      headingTagsExact: ["h2", "h4", "h3"],
      minCounts: {
        paragraphCount: 3,
      },
    },
  },
  {
    id: "headings-h2-siblings",
    label: "H2 Siblings",
    prompt: [
      "Markdown本文のみで回答してください。",
      "次の見出しをこの順番で必ず使ってください。",
      "## Alpha",
      "1文。",
      "## Beta",
      "1文。",
      "## Gamma",
      "1文。",
    ].join("\n"),
    expects: {
      headingTagsExact: ["h2", "h2", "h2"],
      minCounts: {
        paragraphCount: 3,
      },
    },
  },
  {
    id: "unordered-list-nested",
    label: "Nested Unordered List",
    prompt: [
      "Markdown本文のみで回答してください。",
      "次の構造で出力してください。",
      "## Shopping List",
      "導入文を1文。",
      "- 箇条書き3個",
      "- 2個目の項目の下にネストした箇条書きを2個",
    ].join("\n"),
    expects: {
      headingTagsInclude: ["h2"],
      minCounts: {
        unorderedListCount: 2,
        listItemCount: 5,
      },
    },
  },
  {
    id: "ordered-list-nested",
    label: "Nested Ordered List",
    prompt: [
      "Markdown本文のみで回答してください。",
      "次の構造で出力してください。",
      "## Steps",
      "導入文を1文。",
      "1. 連番3個",
      "2. 1個目の項目の下にネストした連番を2個",
    ].join("\n"),
    expects: {
      headingTagsInclude: ["h2"],
      minCounts: {
        orderedListCount: 2,
        listItemCount: 5,
      },
    },
  },
  {
    id: "code-block-javascript",
    label: "JavaScript Code Block",
    prompt: [
      "Markdown本文のみで回答してください。",
      "次の構造で出力してください。",
      "## Sample",
      "短い説明を1文。",
      "JavaScriptのコードブロックを1つ。",
      "インラインコードで `npm test` を1回だけ含めてください。",
    ].join("\n"),
    expects: {
      headingTagsInclude: ["h2"],
      minCounts: {
        codeBlockCount: 1,
        inlineCodeCount: 1,
      },
    },
  },
  {
    id: "markdown-table",
    label: "Markdown Table",
    prompt: [
      "Markdown本文のみで回答してください。",
      "次の構造で出力してください。",
      "## Comparison",
      "短い導入文を1文。",
      "3列2行のMarkdown表を1つ。",
    ].join("\n"),
    expects: {
      headingTagsInclude: ["h2"],
      minCounts: {
        tableCount: 1,
      },
    },
  },
  {
    id: "blockquote-link",
    label: "Blockquote And Link",
    prompt: [
      "Markdown本文のみで回答してください。",
      "次の構造で出力してください。",
      "## Notes",
      "2行の引用ブロックを1つ。",
      "その後に https://example.com へのMarkdownリンクを1つ。",
    ].join("\n"),
    expects: {
      headingTagsInclude: ["h2"],
      minCounts: {
        blockquoteCount: 1,
        linkCount: 1,
      },
    },
  },
  {
    id: "task-list",
    label: "Task List",
    prompt: [
      "Markdown本文のみで回答してください。",
      "次の構造で出力してください。",
      "## Checklist",
      "導入文を1文。",
      "- [ ] 未完了タスクを2個",
      "- [x] 完了タスクを1個",
    ].join("\n"),
    expects: {
      headingTagsInclude: ["h2"],
      minCounts: {
        unorderedListCount: 1,
        listItemCount: 3,
        checkboxCount: 3,
      },
    },
  },
  {
    id: "horizontal-rule",
    label: "Horizontal Rule",
    prompt: [
      "Markdown本文のみで回答してください。",
      "次の構造で出力してください。",
      "## Sections",
      "最初の短い段落を1つ。",
      "そのあと水平線を1つ。",
      "最後に別の短い段落を1つ。",
    ].join("\n"),
    expects: {
      headingTagsInclude: ["h2"],
      minCounts: {
        horizontalRuleCount: 1,
        paragraphCount: 2,
      },
    },
  },
  {
    id: "nested-blockquote",
    label: "Nested Blockquote",
    prompt: [
      "Markdown本文のみで回答してください。",
      "次の構造で出力してください。",
      "## Quotes",
      "2階層のネストした引用ブロックを1つ。",
    ].join("\n"),
    expects: {
      headingTagsInclude: ["h2"],
      minCounts: {
        blockquoteCount: 2,
        nestedBlockquoteCount: 1,
      },
    },
  },
  {
    id: "mixed-markdown",
    label: "Mixed Markdown",
    prompt: [
      "Markdown本文のみで回答してください。",
      "次の構造で出力してください。",
      "## Plan",
      "短い導入文を1文。",
      "### Tasks",
      "箇条書きを2個。",
      "### Example",
      "短いJavaScriptコードブロックを1つ。",
      "最後に短い引用ブロックを1つ。",
    ].join("\n"),
    expects: {
      headingTagsExact: ["h2", "h3", "h3"],
      minCounts: {
        unorderedListCount: 1,
        listItemCount: 2,
        codeBlockCount: 1,
        blockquoteCount: 1,
      },
    },
  },
];

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
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
  for (let attempt = 0; attempt < 90; attempt += 1) {
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
    const inlineCodeCount = Array.from(element.querySelectorAll("code")).filter(
      (node) => !node.closest("pre")
    ).length;
    const tableRows = Array.from(element.querySelectorAll("table tr")).length;
    const codeBlockCount = element.querySelectorAll("pre").length;
    const blockquotes = Array.from(element.querySelectorAll("blockquote"));
    const nestedBlockquoteCount = blockquotes.filter((node) => node.querySelector("blockquote")).length;
    const checkboxCount = element.querySelectorAll("input[type='checkbox']").length;
    return {
      innerHTML: element.innerHTML,
      outerHTML: element.outerHTML,
      text: element.innerText || element.textContent || "",
      assistantMessageId: element.getAttribute("data-message-id") || "",
      assistantModelSlug: element.getAttribute("data-message-model-slug") || "",
      headings,
      headingTags: headings.map((heading) => heading.tagName),
      codeBlockCount,
      inlineCodeCount,
      linkCount: element.querySelectorAll("a[href]").length,
      blockquoteCount: blockquotes.length,
      nestedBlockquoteCount,
      checkboxCount,
      tableCount: element.querySelectorAll("table").length,
      tableRowCount: tableRows,
      unorderedListCount: element.querySelectorAll("ul").length,
      orderedListCount: element.querySelectorAll("ol").length,
      listItemCount: element.querySelectorAll("li").length,
      paragraphCount: element.querySelectorAll("p").length,
      horizontalRuleCount: element.querySelectorAll("hr").length,
    };
  });
}

function validateScenario(scenario, result) {
  const errors = [];
  const expects = scenario.expects || {};

  if (Array.isArray(expects.headingTagsExact)) {
    const actual = result.headingTags || [];
    const expected = expects.headingTagsExact;
    if (actual.join("|") !== expected.join("|")) {
      errors.push(`headingTagsExact expected=${expected.join(",")} actual=${actual.join(",")}`);
    }
  }

  if (Array.isArray(expects.headingTagsInclude)) {
    for (const tagName of expects.headingTagsInclude) {
      if (!(result.headingTags || []).includes(tagName)) {
        errors.push(`headingTagsInclude missing=${tagName} actual=${(result.headingTags || []).join(",")}`);
      }
    }
  }

  const minCounts = expects.minCounts || {};
  for (const [field, min] of Object.entries(minCounts)) {
    if (Number(result[field] || 0) < Number(min)) {
      errors.push(`${field} expected>=${min} actual=${result[field] || 0}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

async function saveScenarioArtifacts({ scenario, attempt, result, validation }) {
  const screenshotDir = path.join(artifactsRoot, "screenshots");
  const stateDir = path.join(artifactsRoot, "state");
  const htmlFileName = `${safeSlug(scenario.id)}.html`;
  const outerHtmlFileName = `${safeSlug(scenario.id)}.message.html`;
  const screenshotName = attempt === 1
    ? `${safeSlug(scenario.id)}.png`
    : `${safeSlug(scenario.id)}.attempt-${attempt}.png`;
  const stateName = attempt === 1
    ? `${safeSlug(scenario.id)}.json`
    : `${safeSlug(scenario.id)}.attempt-${attempt}.json`;

  await Promise.all([
    ensureDir(screenshotDir),
    ensureDir(stateDir),
    fs.writeFile(path.join(fixtureRoot, htmlFileName), `${result.innerHTML}\n`, "utf8"),
    fs.writeFile(path.join(fixtureRoot, outerHtmlFileName), `${result.outerHTML}\n`, "utf8"),
    fs.writeFile(
      path.join(stateDir, stateName),
      `${JSON.stringify({ scenario, attempt, validation, result }, null, 2)}\n`,
      "utf8"
    ),
  ]);

  return {
    htmlFileName,
    outerHtmlFileName,
    screenshotPath: path.join(screenshotDir, screenshotName),
  };
}

async function writeManifest(entries) {
  await fs.writeFile(
    path.join(fixtureRoot, "manifest.json"),
    `${JSON.stringify(
      {
        collectedAt: new Date().toISOString(),
        source: "chatgpt.com",
        scenarios: entries,
      },
      null,
      2
    )}\n`,
    "utf8"
  );
}

module.exports = {
  artifactsRoot,
  fixtureRoot,
  scenarios,
  ensureDir,
  safeSlug,
  submitPrompt,
  collectScenarioResult,
  validateScenario,
  saveScenarioArtifacts,
  writeManifest,
};
