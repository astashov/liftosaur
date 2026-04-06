const Module = require("module");
const origResolve = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "react-native" || request.startsWith("react-native/")) {
    return origResolve.call(this, "react-native-web", parent, isMain, options);
  }
  return origResolve.call(this, request, parent, isMain, options);
};
