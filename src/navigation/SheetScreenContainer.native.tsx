import { JSX, ReactNode, createContext, useContext, useEffect, useRef, useCallback } from "react";
import {
  View,
  Pressable,
  Animated,
  PanResponder,
  PanResponderInstance,
  useWindowDimensions,
  ViewStyle,
  StyleProp,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCustomKeyboardHeight } from "./CustomKeyboardContext";

interface IProps {
  children: ReactNode;
  shouldShowClose?: boolean;
  onClose: () => void;
}

const SheetPanContext = createContext<PanResponderInstance | null>(null);

export function SheetDragHandle(props: {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
}): JSX.Element {
  const pan = useContext(SheetPanContext);
  return (
    <View {...(pan ? pan.panHandlers : {})} className={props.className} style={props.style}>
      {props.children}
    </View>
  );
}

export function SheetScreenContainer(props: IProps): JSX.Element {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useCustomKeyboardHeight();
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
    <SheetPanContext.Provider value={panResponder}>
      <View className="justify-end flex-1">
        <Animated.View className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }}>
          <Pressable className="absolute inset-0" onPress={handleClose} />
        </Animated.View>
        <Animated.View
          className="overflow-hidden bg-background-default"
          style={{
            height: sheetHeight + insets.bottom + keyboardHeight,
            paddingBottom: insets.bottom + keyboardHeight,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            transform: [{ translateY }],
          }}
        >
          <SheetDragHandle className="items-center py-2">
            <View className="rounded-full bg-text-disabled" style={{ width: 36, height: 5 }} />
          </SheetDragHandle>
          {props.children}
        </Animated.View>
      </View>
    </SheetPanContext.Provider>
  );
}
