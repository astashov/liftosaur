import React, { JSX, useCallback, useRef } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from "react-native-reanimated";

interface ISwipeableRowProps {
  children: (props: {
    onPointerDown: (event: React.TouchEvent | React.PointerEvent) => void;
    onPointerUp: () => void;
    style: Record<string, unknown>;
    close: () => void;
    moveRef: React.RefObject<View | null>;
  }) => JSX.Element;
  width: number;
  onPointerDown?: () => void;
  openThreshold: number;
  closeThreshold: number;
  initiateTreshold: number;
  scrollThreshold: number;
  showHint?: boolean;
}

export function SwipeableRow(props: ISwipeableRowProps): JSX.Element {
  const { children, width, openThreshold, closeThreshold } = props;
  const translateX = useSharedValue(0);
  const isOpen = useSharedValue(false);
  const moveRef = useRef<View>(null);

  const springConfig = { damping: 25, stiffness: 300, overshootClamping: true };

  const close = useCallback(() => {
    translateX.value = withSpring(0, springConfig);
    isOpen.value = false;
  }, []);

  const firePointerDown = useCallback(() => {
    props.onPointerDown?.();
  }, [props.onPointerDown]);

  const pan = Gesture.Pan()
    .activeOffsetX([-props.initiateTreshold, props.initiateTreshold])
    .failOffsetY([-props.scrollThreshold, props.scrollThreshold])
    .onStart(() => {
      if (props.onPointerDown) {
        runOnJS(firePointerDown)();
      }
    })
    .onUpdate((e) => {
      const delta = e.translationX + (isOpen.value ? -width : 0);
      translateX.value = Math.max(-width, Math.min(0, delta));
    })
    .onEnd(() => {
      if (!isOpen.value && translateX.value < -openThreshold) {
        translateX.value = withSpring(-width, springConfig);
        isOpen.value = true;
      } else if (isOpen.value && translateX.value > -closeThreshold) {
        translateX.value = withSpring(0, springConfig);
        isOpen.value = false;
      } else {
        const target = isOpen.value ? -width : 0;
        translateX.value = withSpring(target, springConfig);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={{ overflow: "hidden" }}>
      <GestureDetector gesture={pan}>
        <Animated.View style={animatedStyle}>
          {children({
            onPointerDown: () => {},
            onPointerUp: () => {},
            style: {},
            close,
            moveRef,
          })}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
