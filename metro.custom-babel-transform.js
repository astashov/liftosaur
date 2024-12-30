const { transform } = require("@react-native/metro-babel-transformer");

module.exports.transform = (props) => {
  return transform({ ...props, options: { ...props.options, extendsBabelConfigPath: "./babel.config.metro.js" } });
};
