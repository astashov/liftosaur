const React = require("react");

function chainable() {
  const obj = {};
  const methods = [
    "minPointers",
    "maxPointers",
    "enabled",
    "shouldCancelWhenOutside",
    "hitSlop",
    "activeOffsetX",
    "activeOffsetY",
    "failOffsetX",
    "failOffsetY",
    "activateAfterLongPress",
    "minDistance",
    "minVelocity",
    "minVelocityX",
    "minVelocityY",
    "onBegin",
    "onStart",
    "onUpdate",
    "onChange",
    "onEnd",
    "onFinalize",
    "onTouchesDown",
    "onTouchesMove",
    "onTouchesUp",
    "onTouchesCancelled",
    "simultaneousWithExternalGesture",
    "requireExternalGestureToFail",
    "runOnJS",
    "withRef",
    "withTestId",
  ];
  for (const name of methods) {
    obj[name] = () => obj;
  }
  return obj;
}

const Gesture = {
  Pan: () => chainable(),
  Pinch: () => chainable(),
  Tap: () => chainable(),
  LongPress: () => chainable(),
  Rotation: () => chainable(),
  Fling: () => chainable(),
  Hover: () => chainable(),
  Native: () => chainable(),
  Manual: () => chainable(),
  Simultaneous: () => chainable(),
  Race: () => chainable(),
  Exclusive: () => chainable(),
};

function GestureDetector(props) {
  return React.createElement(React.Fragment, null, props.children);
}

function GestureHandlerRootView(props) {
  return React.createElement(React.Fragment, null, props.children);
}

module.exports = {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  State: {},
  Directions: {},
};
