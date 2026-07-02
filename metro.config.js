const { execSync } = require("child_process");
const { getDefaultConfig } = require("@react-native/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const exclusionList = require("metro-config/src/defaults/exclusionList");

execSync("node scripts/generate-theme-css.js", { cwd: __dirname, stdio: "inherit" });

const config = getDefaultConfig(__dirname);

// Don't crawl nested dev/agent worktrees — their duplicate package.json ("liftosaur")
// would trigger a Metro haste-map collision. Anchored to this project root so Metro
// still resolves normally when run from INSIDE a worktree.
const escapedRoot = __dirname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
config.resolver.blockList = exclusionList([
  /(\/__tests__\/.*)$/,
  new RegExp(`^${escapedRoot}/worktrees/.*`),
  new RegExp(`^${escapedRoot}/\\.claude/worktrees/.*`),
]);

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./global.css",
  dtsFile: "./uniwind-types.d.ts",
});
