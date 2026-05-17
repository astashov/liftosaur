const path = require("path");
const { getDefaultConfig } = require("@expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Force `react-native` to resolve to the real package on native platforms,
  // bypassing expo's autolinking sticky-resolver which (in some cases) sends
  // it to `react-native-web` even for android/ios.
  if ((moduleName === "react-native" || moduleName === "react-native/index") && platform !== "web") {
    return context.resolveRequest(context, "react-native/index", platform);
  }
  return upstreamResolveRequest
    ? upstreamResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, {
  input: path.resolve(__dirname, "global.css"),
  configPath: path.resolve(__dirname, "tailwind.config.native.js"),
  inlineRem: false,
});
