const path = require("path");
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: path.join(__dirname, "tests"),
  testMatch: /.*\.spec\.js$/,
  timeout: 60_000,
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    headless: true,
    trace: "off",
    video: "retain-on-failure"
  }
});
