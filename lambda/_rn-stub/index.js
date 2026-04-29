"use strict";

const noop = () => {};
const unsupported = (name) => () => {
  throw new Error(`react-native stub: ${name} is not available in the Lambda runtime`);
};

exports.Platform = { OS: "web", select: (spec) => spec.web ?? spec.default };
exports.Alert = { alert: noop, prompt: noop };
exports.ActionSheetIOS = { showActionSheetWithOptions: unsupported("ActionSheetIOS.showActionSheetWithOptions") };
