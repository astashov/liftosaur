const path = require("path");
const Module = require("module");
const origResolve = Module._resolveFilename;

if (typeof global.__DEV__ === "undefined") {
  global.__DEV__ = false;
}

const gestureHandlerStub = path.join(__dirname, "src/utils/rnStubs/gestureHandler.js");
const reanimatedStub = path.join(__dirname, "src/utils/rnStubs/reanimated.js");
const uniwindShim = path.join(__dirname, "src/utils/uniwindSsrShim.js");
const uniwindSep = `${path.sep}uniwind${path.sep}`;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "react-native" || request.startsWith("react-native/")) {
    const issuer = parent && parent.filename ? parent.filename : "";
    if (request === "react-native" && !issuer.includes(uniwindSep)) {
      return uniwindShim;
    }
    return origResolve.call(this, "react-native-web", parent, isMain, options);
  }
  if (request === "uniwind/components") {
    return uniwindShim;
  }
  if (request === "react-native-gesture-handler" || request.startsWith("react-native-gesture-handler/")) {
    return gestureHandlerStub;
  }
  if (request === "react-native-reanimated" || request.startsWith("react-native-reanimated/")) {
    return reanimatedStub;
  }
  return origResolve.call(this, request, parent, isMain, options);
};
