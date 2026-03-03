const fs = require("fs/promises");
const path = require("path");

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function ensureArtifactDirs(...dirPaths) {
  await Promise.all(dirPaths.map((dirPath) => ensureDir(dirPath)));
}

async function writeJsonArtifact(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

module.exports = {
  ensureDir,
  ensureArtifactDirs,
  writeJsonArtifact,
};
