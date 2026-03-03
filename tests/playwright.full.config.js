const { createConfig, path } = require("./playwright.shared");

module.exports = createConfig({
  fullyParallel: false,
  workers: 1,
  outputDir: path.join(__dirname, "test-results-full"),
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: path.join(__dirname, "playwright-report-full") }],
  ],
});
