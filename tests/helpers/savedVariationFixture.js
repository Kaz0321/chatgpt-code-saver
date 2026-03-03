const fs = require("fs");
const path = require("path");

const fixtureRoot = path.join(__dirname, "..", "fixtures", "saved-variation");
const htmlFileName = "繝√Ε繝・ヨ蜀・｡ｨ迴ｾ繝舌Μ繧ｨ繝ｼ繧ｷ繝ｧ繝ｳ.html";
const assetsDirName = "繝√Ε繝・ヨ蜀・｡ｨ迴ｾ繝舌Μ繧ｨ繝ｼ繧ｷ繝ｧ繝ｳ_files";

function getSavedVariationFixture() {
  const htmlPath = path.join(fixtureRoot, htmlFileName);
  const assetsDirPath = path.join(fixtureRoot, assetsDirName);
  if (!fs.existsSync(htmlPath) || !fs.existsSync(assetsDirPath)) {
    return null;
  }
  return {
    htmlPath,
    assetsDirPath,
    assetsDirName,
  };
}

module.exports = {
  getSavedVariationFixture,
};
