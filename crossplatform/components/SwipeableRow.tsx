import React, { useRef } from "react";
import type { JSX } from "react";
import { View, Animated, PanResponder } from "react-native";

interface IProps {
  children: React.ReactNode;
  renderActions?: () => JSX.Element;
  actionWidth?: number;
  enabled?: boolean;
}

export function SwipeableRow(props: IProps): JSX.Element {
  const translateX = useRef(new Animated.Value(0)).current;
  const actionWidth = props.actionWidth ?? 128;
  const enabled = props.enabled !== false;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return enabled && Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -actionWidth));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -actionWidth / 3) {
          Animated.spring(translateX, {
            toValue: -actionWidth,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        }
      },
    })
  ).current;

  const close = (): void => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  };

  if (!props.renderActions) {
    return <View>{props.children}</View>;
  }

  return (
    <View style={{ overflow: "hidden" }}>
      <View
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: actionWidth,
          flexDirection: "row",
        }}
      >
        {props.renderActions()}
      </View>
      <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateX }] }}>
        {typeof props.children === "function"
          ? (props.children as (args: { close: () => void }) => JSX.Element)({ close })
          : props.children}
      </Animated.View>
    </View>
  );
}
