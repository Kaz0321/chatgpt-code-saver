const fs = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");

const repoRoot = path.join(__dirname, "..", "..");
const testsRoot = path.join(__dirname, "..");
const manifestPath = path.join(testsRoot, "fixtures", "live-ui-patterns", "manifest.json");
const artifactsRoot = path.join(testsRoot, "artifacts", "ui-pattern-test-evidence");
const playwrightBin = path.join(repoRoot, "node_modules", ".bin", "playwright");
const ldLibraryPath = path.join(testsRoot, ".local-libs", "usr", "lib", "x86_64-linux-gnu");

const testTargets = [
  {
    id: "offline",
    spec: "tests/e2e/chatgpt-ui-patterns-offline.spec.js",
    screenshotRoot: path.join(testsRoot, "artifacts", "chatgpt-ui-patterns-offline"),
  },
  {
    id: "extension",
    spec: "tests/e2e/chatgpt-ui-patterns-extension-offline.spec.js",
    screenshotRoot: path.join(testsRoot, "artifacts", "chatgpt-ui-patterns-extension-offline"),
  },
];

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function runCommand(args) {
  return new Promise((resolve) => {
    const child = spawn(playwrightBin, args, {
      cwd: repoRoot,
      env: {
        ...process.env,
        LD_LIBRARY_PATH: ldLibraryPath,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code, signal) => {
      resolve({
        exitCode: code,
        signal: signal || null,
        stdout,
        stderr,
      });
    });
  });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const scenarios = (manifest.scenarios || []).filter((scenario) => scenario.validated);

  await ensureDir(artifactsRoot);

  const summary = {
    startedAt: new Date().toISOString(),
    scenarioCount: scenarios.length,
    results: [],
  };

  for (const scenario of scenarios) {
    for (const target of testTargets) {
      const startedAt = Date.now();
      const args = [
        "test",
        "--config",
        "tests/playwright.full.config.js",
        target.spec,
        "-g",
        scenario.id,
      ];
      const result = await runCommand(args);
      const durationMs = Date.now() - startedAt;
      const scenarioEvidenceDir = path.join(artifactsRoot, target.id, scenario.id);
      const screenshotPath = path.join(target.screenshotRoot, scenario.id, "screenshots", `${scenario.id}.png`);

      await ensureDir(scenarioEvidenceDir);
      await Promise.all([
        fs.writeFile(path.join(scenarioEvidenceDir, "stdout.log"), result.stdout, "utf8"),
        fs.writeFile(path.join(scenarioEvidenceDir, "stderr.log"), result.stderr, "utf8"),
        fs.writeFile(
          path.join(scenarioEvidenceDir, "result.json"),
          `${JSON.stringify(
            {
              scenarioId: scenario.id,
              target: target.id,
              spec: target.spec,
              exitCode: result.exitCode,
              signal: result.signal,
              durationMs,
              screenshotPath,
              screenshotExists: await fileExists(screenshotPath),
            },
            null,
            2
          )}\n`,
          "utf8"
        ),
      ]);

      summary.results.push({
        scenarioId: scenario.id,
        target: target.id,
        exitCode: result.exitCode,
        durationMs,
        screenshotPath,
        screenshotExists: await fileExists(screenshotPath),
      });
    }
  }

  summary.finishedAt = new Date().toISOString();
  summary.failed = summary.results.filter((entry) => entry.exitCode !== 0);

  await fs.writeFile(
    path.join(artifactsRoot, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8"
  );

  if (summary.failed.length) {
    console.error(`Evidence run completed with ${summary.failed.length} failures.`);
    process.exitCode = 1;
    return;
  }

  console.log(`Evidence run completed: ${summary.results.length} test invocations passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
