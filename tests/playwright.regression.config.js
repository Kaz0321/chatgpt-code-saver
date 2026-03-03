const { createConfig } = require("./playwright.shared");

module.exports = createConfig({
  fullyParallel: true,
  workers: 2,
  grepInvert: /@ui-evidence|@live/,
  reporter: [["list"]],
});
