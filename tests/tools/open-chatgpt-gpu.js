const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { chromium } = require("playwright");

function startFcitx5IfAvailable(env, logPath) {
  const command = [
    "pkill -x fcitx5 >/dev/null 2>&1 || true",
    "command -v fcitx5 >/dev/null 2>&1 || exit 0",
    `fcitx5 --replace --keep -d > ${JSON.stringify(logPath)} 2>&1`,
  ].join("; ");
  const child = spawn("bash", ["-lc", command], {
    stdio: "ignore",
    detached: true,
    env,
  });
  child.unref();
}

async function waitForFcitx5Start(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const probe = spawn("bash", ["-lc", "pgrep -x fcitx5 >/dev/null 2>&1"]);
    const exitCode = await new Promise((resolve) => {
      probe.on("exit", resolve);
      probe.on("error", () => resolve(1));
    });
    if (exitCode === 0) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function ensureFcitx5Profile() {
  const configDir = path.join(os.homedir(), ".config", "fcitx5");
  const profilePath = path.join(configDir, "profile");
  const desired = `[Groups/0]
# Group Name
Name=Default
# Layout
Default Layout=us
# Default Input Method
DefaultIM=mozc

[Groups/0/Items/0]
# Name
Name=keyboard-us
# Layout
Layout=

[Groups/0/Items/1]
# Name
Name=mozc
# Layout
Layout=

[GroupOrder]
0=Default
`;
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(profilePath, desired, "utf8");
}

async function main() {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "pw-chatgpt-gpu-"));
  const fcitxLogPath = path.join(os.tmpdir(), "fcitx5-playwright.log");
  const fontConfigFile = path.join(__dirname, "..", "config", "fontconfig-windows-ja.conf");
  const runtimeDir = process.env.XDG_RUNTIME_DIR || `/run/user/${process.getuid()}`;
  const env = {
    ...process.env,
    XDG_SESSION_TYPE: "wayland",
    XDG_RUNTIME_DIR: runtimeDir,
    WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY || "wayland-0",
    DBUS_SESSION_BUS_ADDRESS:
      process.env.DBUS_SESSION_BUS_ADDRESS || `unix:path=${runtimeDir}/bus`,
    GTK_IM_MODULE: "fcitx",
    QT_IM_MODULE: "fcitx",
    XMODIFIERS: "@im=fcitx",
    SDL_IM_MODULE: "fcitx",
    INPUT_METHOD: "fcitx",
    FONTCONFIG_PATH: "/etc/fonts",
    FONTCONFIG_FILE: fontConfigFile,
  };

  await ensureFcitx5Profile();
  startFcitx5IfAvailable(env, fcitxLogPath);
  const fcitxRunning = await waitForFcitx5Start(5_000);

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: false,
    env,
    viewport: { width: 1024, height: 1024 },
    ignoreDefaultArgs: ["--enable-unsafe-swiftshader"],
    args: [
      "--ozone-platform=wayland",
      "--disable-software-rasterizer",
      "--enable-wayland-ime",
      "--wayland-text-input-version=3",
    ],
  });

  const page = context.pages()[0] || (await context.newPage());
  await page.goto("https://chatgpt.com/", {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });

  if (!fcitxRunning) {
    console.warn(`fcitx5 did not stay running. Check ${fcitxLogPath} for details.`);
  }
  console.log("Opened ChatGPT with Wayland IME flags enabled and fcitx5/mozc profile prepared.");
  await new Promise(() => {});
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
