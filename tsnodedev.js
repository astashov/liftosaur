require("@babel/register")({
  extensions: [".js", ".jsx"],
  only: [/node_modules\/react-native.*/],
  presets: ["@babel/preset-env", "@babel/preset-react"],
});

const { resolve, extname } = require("path");
const { existsSync } = require("fs");
const Module = require("module");

const originalResolveFilename = Module._resolveFilename;

const customExtensions = [".web.tsx", ".web.ts", ".web.js"];

Module._resolveFilename = function (request, parent, isMain, options) {
  const aliasedRequest = request
    .replace(/(^|\/)react-native$/, "$1react-native-web")
    .replace(/(^|\/)react-native-svg($|\/)/, "$1react-native-svg-web$2");
  if (!extname(aliasedRequest)) {
    for (const ext of customExtensions) {
      const fullPath = resolve(parent.path, `${aliasedRequest}${ext}`);

      if (existsSync(fullPath)) {
        return fullPath;
      }
    }
  }
  return originalResolveFilename.call(this, aliasedRequest, parent, isMain, options);
};
