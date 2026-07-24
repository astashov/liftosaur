// __PERF__ is inlined at babel-transform time based on the PERF env var. The
// JS engine in production builds doesn't have a real process.env, so we replace
// every `__PERF__` identifier with the literal true/false here. This matches
// what Metro does for __DEV__ (via the `dev` flag of the transformer).
//
// Set PERF=1 npm run ios-release  (or any release script) to enable.

function inlinePerfFlag({ types: t }) {
  const perfEnabled = process.env.PERF === "1";
  return {
    name: "inline-perf-flag",
    visitor: {
      Identifier(path) {
        if (path.node.name !== "__PERF__") return;
        if (path.scope.hasBinding("__PERF__")) return;
        // skip key/property positions
        if (path.parentPath.isMemberExpression() && path.parent.property === path.node) return;
        if (path.parentPath.isObjectProperty() && path.parent.key === path.node && !path.parent.computed) return;
        path.replaceWith(t.booleanLiteral(perfEnabled));
      },
    },
  };
}

module.exports = function (api) {
  // Make babel's cache depend on PERF so toggling it invalidates transformed files.
  api.cache.using(() => process.env.PERF || "0");
  return {
    presets: ["module:@react-native/babel-preset"],
    plugins: [inlinePerfFlag, "react-native-worklets/plugin"],
  };
};
