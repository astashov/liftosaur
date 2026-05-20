const { execSync } = require("child_process");
const { getDefaultConfig } = require("@react-native/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

execSync("node scripts/generate-theme-css.js", { cwd: __dirname, stdio: "inherit" });

const config = getDefaultConfig(__dirname);

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./global.css",
  dtsFile: "./uniwind-types.d.ts",
});
