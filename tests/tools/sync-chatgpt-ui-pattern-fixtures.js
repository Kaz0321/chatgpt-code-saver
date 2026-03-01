const fs = require("fs/promises");
const path = require("path");

const testsRoot = path.join(__dirname, "..");
const stateDir = path.join(testsRoot, "artifacts", "chatgpt-ui-patterns", "state");
const fixtureRoot = path.join(testsRoot, "fixtures", "live-ui-patterns");
const offlineArtifactsRoot = path.join(testsRoot, "artifacts", "chatgpt-ui-patterns-offline");
const extensionOfflineArtifactsRoot = path.join(testsRoot, "artifacts", "chatgpt-ui-patterns-extension-offline");
const scenarioOrder = [
  "headings-h1-h6",
  "headings-starts-at-h2",
  "headings-skipped-levels",
  "headings-h2-siblings",
  "unordered-list-nested",
  "ordered-list-nested",
  "code-block-javascript",
  "markdown-table",
  "blockquote-link",
  "task-list",
  "horizontal-rule",
  "nested-blockquote",
  "mixed-markdown",
];

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function pickBestAttempt(currentEntry, nextEntry) {
  if (!currentEntry) {
    return nextEntry;
  }
  return Number(nextEntry.attempt || 0) >= Number(currentEntry.attempt || 0)
    ? nextEntry
    : currentEntry;
}

function buildSummary(result) {
  return {
    headingTags: result.headingTags || [],
    codeBlockCount: Number(result.codeBlockCount || 0),
    inlineCodeCount: Number(result.inlineCodeCount || 0),
    linkCount: Number(result.linkCount || 0),
    blockquoteCount: Number(result.blockquoteCount || 0),
    nestedBlockquoteCount: Number(result.nestedBlockquoteCount || 0),
    checkboxCount: Number(result.checkboxCount || 0),
    tableCount: Number(result.tableCount || 0),
    tableRowCount: Number(result.tableRowCount || 0),
    unorderedListCount: Number(result.unorderedListCount || 0),
    orderedListCount: Number(result.orderedListCount || 0),
    listItemCount: Number(result.listItemCount || 0),
    paragraphCount: Number(result.paragraphCount || 0),
    horizontalRuleCount: Number(result.horizontalRuleCount || 0),
  };
}

async function loadValidatedStates() {
  const files = (await fs.readdir(stateDir))
    .filter((fileName) => fileName.endsWith(".json") && !fileName.endsWith(".error.json"))
    .sort();

  const bestByScenario = new Map();

  for (const fileName of files) {
    const payload = JSON.parse(await fs.readFile(path.join(stateDir, fileName), "utf8"));
    if (!payload?.validation?.ok || !payload?.scenario?.id || !payload?.result?.outerHTML) {
      continue;
    }
    bestByScenario.set(
      payload.scenario.id,
      pickBestAttempt(bestByScenario.get(payload.scenario.id), payload)
    );
  }

  return bestByScenario;
}

async function writeFixtureFiles(entry) {
  const responseHtmlFile = `${entry.scenario.id}.html`;
  const responseOuterHtmlFile = `${entry.scenario.id}.message.html`;

  await Promise.all([
    fs.writeFile(path.join(fixtureRoot, responseHtmlFile), `${entry.result.innerHTML || ""}\n`, "utf8"),
    fs.writeFile(path.join(fixtureRoot, responseOuterHtmlFile), `${entry.result.outerHTML || ""}\n`, "utf8"),
  ]);

  return { responseHtmlFile, responseOuterHtmlFile };
}

function sortEntries(entries) {
  const orderMap = new Map(scenarioOrder.map((id, index) => [id, index]));
  return [...entries].sort((left, right) => {
    const leftOrder = orderMap.has(left.id) ? orderMap.get(left.id) : Number.MAX_SAFE_INTEGER;
    const rightOrder = orderMap.has(right.id) ? orderMap.get(right.id) : Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return left.id.localeCompare(right.id);
  });
}

async function writeManifest(entries) {
  const manifest = {
    collectedAt: new Date().toISOString(),
    source: "chatgpt.com",
    scenarios: sortEntries(entries),
  };

  await fs.writeFile(
    path.join(fixtureRoot, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );

  return manifest;
}

async function writeFrameRequirementsReport(manifest) {
  const report = {
    checkedAt: new Date().toISOString(),
    source: "chatgpt.com",
    frameRequired: false,
    requiredDomForOfflineReplay: {
      userMessageSelector: "[data-message-author-role='user']",
      assistantMessageSelector: "[data-message-author-role='assistant']",
      inputSelectors: [
        "div[contenteditable='true'][data-testid='textbox']",
        "textarea[data-testid='chat-input']",
        "textarea",
      ],
    },
    implementationEvidence: [
      {
        file: "extension/content/chatLogTracker.js",
        detail: "Chat log scanning uses [data-message-author-role] as the primary selector.",
      },
      {
        file: "extension/content/chatInput.js",
        detail: "Template insertion only needs a contenteditable composer or textarea.",
      },
      {
        file: "extension/content/chatLogTracker.js",
        detail: "Conversation tracking keys off window.location, not ChatGPT sidebar/header DOM.",
      },
    ],
    fixtureEvidence: {
      replayShell: "minimal shell with user message, live assistant message outerHTML, and textarea",
      liveAssistantOuterHtmlCaptured: true,
      validatedScenarioCount: manifest.scenarios.length,
      scenarioIds: manifest.scenarios.map((scenario) => scenario.id),
    },
  };

  const reportBody = `${JSON.stringify(report, null, 2)}\n`;
  await Promise.all([
    ensureDir(path.join(offlineArtifactsRoot, "state")),
    ensureDir(path.join(extensionOfflineArtifactsRoot, "state")),
  ]);
  await Promise.all([
    fs.writeFile(
      path.join(offlineArtifactsRoot, "state", "offline-frame-requirements.json"),
      reportBody,
      "utf8"
    ),
    fs.writeFile(
      path.join(extensionOfflineArtifactsRoot, "state", "offline-frame-requirements.json"),
      reportBody,
      "utf8"
    ),
  ]);
}

async function main() {
  await Promise.all([
    ensureDir(fixtureRoot),
    ensureDir(offlineArtifactsRoot),
    ensureDir(extensionOfflineArtifactsRoot),
  ]);

  const validatedStates = await loadValidatedStates();
  const manifestEntries = [];

  for (const entry of validatedStates.values()) {
    const { responseHtmlFile, responseOuterHtmlFile } = await writeFixtureFiles(entry);
    manifestEntries.push({
      id: entry.scenario.id,
      label: entry.scenario.label,
      prompt: entry.scenario.prompt,
      responseHtmlFile,
      responseOuterHtmlFile,
      validated: true,
      validationErrors: [],
      summary: buildSummary(entry.result),
      textPreview: String(entry.result.text || "").slice(0, 400),
      assistantMessageId: entry.result.assistantMessageId || "",
      assistantModelSlug: entry.result.assistantModelSlug || "",
    });
  }

  const manifest = await writeManifest(manifestEntries);
  await writeFrameRequirementsReport(manifest);
  console.log(`Synced ${manifest.scenarios.length} validated UI pattern fixtures.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
