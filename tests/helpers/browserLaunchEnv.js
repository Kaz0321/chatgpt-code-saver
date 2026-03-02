const path = require("path");

function getBrowserLaunchEnv() {
  return {
    ...process.env,
    FONTCONFIG_PATH: "/etc/fonts",
    FONTCONFIG_FILE: path.join(__dirname, "..", "config", "fontconfig-windows-ja.conf"),
  };
}

module.exports = {
  getBrowserLaunchEnv,
};
