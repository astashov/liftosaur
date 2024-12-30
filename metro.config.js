const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
// Use custom babel.config.rn.js for React Native
const config = {
  transformer: {
    babelTransformerPath: require.resolve("./metro.custom-babel-transform"),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
