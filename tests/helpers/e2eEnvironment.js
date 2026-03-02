const { getBrowserLaunchEnv } = require("./browserLaunchEnv");

async function probeExtensionContext({ chromium, profileDir, extensionPath }) {
  let context;
  try {
    context = await chromium.launchPersistentContext(profileDir, {
      channel: "chromium",
      headless: true,
      env: getBrowserLaunchEnv(),
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
    return { ok: true, context };
  } catch (error) {
    if (context) {
      await context.close().catch(() => {});
    }
    return {
      ok: false,
      reason: `Extension persistent context is unavailable in this environment: ${error.message}`,
    };
  }
}

module.exports = {
  probeExtensionContext,
};
