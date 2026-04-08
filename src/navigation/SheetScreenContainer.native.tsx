import { JSX, ReactNode, useEffect, useRef, useCallback } from "react";
import { View, Pressable, Animated, PanResponder, useWindowDimensions } from "react-native";

interface IProps {
  children: ReactNode;
  shouldShowClose?: boolean;
  onClose: () => void;
}

export function SheetScreenContainer(props: IProps): JSX.Element {
  const { height: screenHeight } = useWindowDimensions();
  const sheetHeight = Math.round(screenHeight * 0.85);
  const translateY = useRef(new Animated.Value(sheetHeight)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0.5, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: sheetHeight, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      props.onClose();
    });
  }, [sheetHeight, props.onClose]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          translateY.setValue(gs.dy);
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 100 || gs.vy > 0.5) {
          handleClose();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        }
      },
    })
  ).current;

  return (
    <View className="justify-end flex-1">
      <Animated.View className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }}>
        <Pressable className="absolute inset-0" onPress={handleClose} />
      </Animated.View>
      <Animated.View
        className="overflow-hidden bg-background-default"
        style={{ height: sheetHeight, borderTopLeftRadius: 16, borderTopRightRadius: 16, transform: [{ translateY }] }}
      >
        <View {...panResponder.panHandlers} className="items-center py-2">
          <View className="rounded-full bg-text-disabled" style={{ width: 36, height: 5 }} />
        </View>
        {props.children}
      </Animated.View>
    </View>
  );
}
