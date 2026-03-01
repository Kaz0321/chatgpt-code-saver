const path = require("path");
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: path.join(__dirname, "e2e"),
  testMatch: /.*\.spec\.js$/,
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  outputDir: path.join(__dirname, "test-results"),
  reporter: [["list"], ["html", { open: "never", outputFolder: path.join(__dirname, "playwright-report") }]],
  use: {
    headless: true,
    trace: "off",
    video: "retain-on-failure"
  }
});
