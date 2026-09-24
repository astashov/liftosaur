const path = require("path");

module.exports = {
  preset: "react-native",
  rootDir: __dirname,
  testMatch: ["<rootDir>/test-render/**/*.test.tsx"],
  setupFiles: [
    require.resolve("react-native/jest/setup.js"),
    "<rootDir>/test-render/setup/globals.ts",
    "<rootDir>/test-render/setup/devtoolsHook.ts",
    "<rootDir>/test-render/setup/nativeMocks.ts",
  ],
  watchman: false,
  moduleNameMapper: {
    "\\.css$": "<rootDir>/test-render/setup/emptyModule.js",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(?:jest-)?react-native|@react-native|@react-navigation|react-native-.*|uniwind|@legendapp|react-freeze|@expensify)",
  ],
  cacheDirectory: path.join(__dirname, "node_modules/.cache/jest-render"),
};
