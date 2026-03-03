const path = require("path");
const { spawn } = require("child_process");

const repoRoot = path.join(__dirname, "..", "..");
const testsRoot = path.join(__dirname, "..");
const ldLibraryPath = path.join(testsRoot, ".local-libs", "usr", "lib", "x86_64-linux-gnu");
const playwrightCli = require.resolve("@playwright/test/cli");

const child = spawn(process.execPath, [playwrightCli, ...process.argv.slice(2)], {
  cwd: repoRoot,
  env: {
    ...process.env,
    LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH || ldLibraryPath,
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
