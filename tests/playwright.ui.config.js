const { createConfig, path } = require("./playwright.shared");

module.exports = createConfig({
  workers: 1,
  grep: /@ui-evidence/,
  outputDir: path.join(__dirname, "test-results-ui"),
  reporter: [["list"]],
});
