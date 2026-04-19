import type { JSX, ReactNode } from "react";
import { View, Pressable, Animated, useWindowDimensions } from "react-native";
import { useEffect, useRef, useCallback } from "react";
import { useCustomKeyboardHeight } from "../navigation/CustomKeyboardContext";

interface IProps {
  isHidden: boolean;
  shouldShowClose?: boolean;
  children: ReactNode;
  zIndex?: number;
  onClose: () => void;
}

export function BottomSheetOrModal(props: IProps): JSX.Element | null {
  const { height } = useWindowDimensions();
  const keyboardHeight = useCustomKeyboardHeight();
  const translateY = useRef(new Animated.Value(height)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (props.isHidden) {
      return;
    }
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0.5, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [props.isHidden]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: height, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => props.onClose());
  }, [height, props.onClose]);

  if (props.isHidden) {
    return null;
  }

  return (
    <View className="absolute inset-0 justify-end" style={{ zIndex: props.zIndex ?? 100 }}>
      <Animated.View className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }}>
        <Pressable className="absolute inset-0" onPress={handleClose} />
      </Animated.View>
      <Animated.View
        className="bg-background-default"
        style={{
          maxHeight: height * 0.85,
          paddingBottom: keyboardHeight,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          transform: [{ translateY }],
        }}
      >
        {props.shouldShowClose && (
          <View className="items-center py-2">
            <View className="rounded-full bg-text-disabled" style={{ width: 36, height: 5 }} />
          </View>
        )}
        {props.children}
      </Animated.View>
    </View>
  );
}
