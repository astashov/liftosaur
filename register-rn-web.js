const path = require("path");
const Module = require("module");
const origResolve = Module._resolveFilename;

const gestureHandlerStub = path.join(__dirname, "src/utils/rnStubs/gestureHandler.js");
const reanimatedStub = path.join(__dirname, "src/utils/rnStubs/reanimated.js");

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "react-native" || request.startsWith("react-native/")) {
    return origResolve.call(this, "react-native-web", parent, isMain, options);
  }
  if (request === "react-native-gesture-handler" || request.startsWith("react-native-gesture-handler/")) {
    return gestureHandlerStub;
  }
  if (request === "react-native-reanimated" || request.startsWith("react-native-reanimated/")) {
    return reanimatedStub;
  }
  return origResolve.call(this, request, parent, isMain, options);
};
