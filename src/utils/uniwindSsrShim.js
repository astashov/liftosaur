const React = require("react");
const RNW = require("react-native-web");

function toRNWClassName(className) {
  return className !== undefined ? { $$css: true, tailwind: className } : undefined;
}

function wrapWithClassName(Component) {
  if (Component == null) {
    return Component;
  }
  const Wrapped = function (props) {
    const { className, style, ...rest } = props;
    if (className === undefined) {
      return React.createElement(Component, props);
    }
    return React.createElement(Component, {
      ...rest,
      style: [toRNWClassName(className), style],
    });
  };
  Wrapped.displayName = `Uniwind(${Component.displayName || Component.name || "Component"})`;
  return Wrapped;
}

const wrappedComponentNames = [
  "ActivityIndicator",
  "Button",
  "FlatList",
  "Image",
  "ImageBackground",
  "KeyboardAvoidingView",
  "Modal",
  "Pressable",
  "RefreshControl",
  "SafeAreaView",
  "ScrollView",
  "SectionList",
  "Switch",
  "Text",
  "TextInput",
  "TouchableHighlight",
  "TouchableNativeFeedback",
  "TouchableOpacity",
  "TouchableWithoutFeedback",
  "View",
  "VirtualizedList",
];

const exportsObj = { ...RNW };
for (const name of wrappedComponentNames) {
  if (RNW[name] != null) {
    exportsObj[name] = wrapWithClassName(RNW[name]);
  }
}

if (RNW.Animated && typeof RNW.Animated.createAnimatedComponent === "function") {
  exportsObj.Animated = {
    ...RNW.Animated,
    View: RNW.Animated.createAnimatedComponent(exportsObj.View),
    Text: RNW.Animated.createAnimatedComponent(exportsObj.Text),
    Image: RNW.Animated.createAnimatedComponent(exportsObj.Image),
    ScrollView: RNW.Animated.createAnimatedComponent(exportsObj.ScrollView),
    FlatList: RNW.Animated.createAnimatedComponent(exportsObj.FlatList),
    SectionList: RNW.Animated.createAnimatedComponent(exportsObj.SectionList),
  };
}

module.exports = exportsObj;
