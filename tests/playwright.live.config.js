const { createConfig, path } = require("./playwright.shared");

module.exports = createConfig({
  workers: 1,
  grep: /@live/,
  outputDir: path.join(__dirname, "test-results-live"),
  reporter: [["list"]],
});
