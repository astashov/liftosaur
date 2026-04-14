const React = require("react");

function View(props) {
  return React.createElement(React.Fragment, null, props.children);
}

function useSharedValue(initial) {
  return { value: initial };
}

function useAnimatedStyle() {
  return {};
}

function useDerivedValue(fn) {
  try {
    return { value: fn() };
  } catch (e) {
    return { value: undefined };
  }
}

function runOnJS(fn) {
  return fn;
}

function runOnUI(fn) {
  return fn;
}

function withTiming(value) {
  return value;
}

function withSpring(value) {
  return value;
}

function withDelay(_delay, value) {
  return value;
}

function withRepeat(value) {
  return value;
}

function withSequence(...values) {
  return values[values.length - 1];
}

function cancelAnimation() {
  return undefined;
}

function interpolate(value) {
  return value;
}

const Easing = {
  linear: (x) => x,
  ease: (x) => x,
  in: (fn) => fn,
  out: (fn) => fn,
  inOut: (fn) => fn,
  bezier: () => (x) => x,
};

const Animated = {
  View,
  Text: View,
  ScrollView: View,
  Image: View,
  createAnimatedComponent: (Component) => Component,
};

module.exports = {
  default: Animated,
  View,
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  runOnJS,
  runOnUI,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  cancelAnimation,
  interpolate,
  Easing,
};
