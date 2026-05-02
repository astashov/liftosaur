import { JSX, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Text } from "./primitives/text";
import { ActionSheet_subscribe, IActionSheetRequest } from "../utils/actionSheet.native";

const ANIM_MS = 220;
const DISMISS_RATIO = 0.35;
const FLICK_VELOCITY = 1200;
const FLICK_MIN_DISTANCE = 40;
const PAN_ACTIVATION_PX = 10;
const MAX_HEIGHT_RATIO = 0.9;
const NO_ANCHOR = -1;

export function ActionSheetHost(): JSX.Element | null {
  const [request, setRequest] = useState<IActionSheetRequest | null>(null);

  useEffect(() => {
    return ActionSheet_subscribe(setRequest);
  }, []);

  if (!request) {
    return null;
  }

  return <ActionSheetModal request={request} onDismissed={() => setRequest(null)} />;
}

function ActionSheetModal(props: { request: IActionSheetRequest; onDismissed: () => void }): JSX.Element {
  const { options, cancelButtonIndex, destructiveButtonIndex, title } = props.request.options;
  const windowHeight = useWindowDimensions().height;
  const insets = useSafeAreaInsets();
  const maxHeight = windowHeight * MAX_HEIGHT_RATIO;

  const translateY = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);
  const scrollOffset = useSharedValue(0);
  const dragAnchor = useSharedValue<number>(NO_ANCHOR);
  const dragStartTranslateY = useSharedValue(0);
  const sheetHeight = useSharedValue(0);
  const isClosing = useRef(false);

  useEffect(() => {
    backdropOpacity.value = withTiming(1, { duration: ANIM_MS });
  }, []);

  const animateClose = (buttonIndex: number | undefined): void => {
    if (isClosing.current) {
      return;
    }
    isClosing.current = true;
    const distance = Math.max(sheetHeight.value, 1);
    backdropOpacity.value = withTiming(0, { duration: ANIM_MS });
    translateY.value = withTiming(distance, { duration: ANIM_MS }, (finished) => {
      if (finished) {
        runOnJS(props.request.callback)(buttonIndex);
        runOnJS(props.onDismissed)();
      }
    });
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollOffset.value = e.contentOffset.y;
    },
  });

  const scrollNativeGesture = useMemo(() => Gesture.Native(), []);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(PAN_ACTIVATION_PX)
        .simultaneousWithExternalGesture(scrollNativeGesture)
        .onUpdate((e) => {
          if (scrollOffset.value > 0) {
            dragAnchor.value = NO_ANCHOR;
            return;
          }
          if (dragAnchor.value === NO_ANCHOR) {
            dragAnchor.value = e.translationY;
            dragStartTranslateY.value = translateY.value;
          }
          const delta = e.translationY - dragAnchor.value;
          translateY.value = Math.max(0, dragStartTranslateY.value + delta);
        })
        .onEnd((e) => {
          dragAnchor.value = NO_ANCHOR;
          console.log("sheetheight", sheetHeight.value);
          const distance = Math.max(sheetHeight.value, 1);
          const draggedFar = translateY.value > distance * DISMISS_RATIO;
          console.log(
            "Distance:",
            translateY.value,
            "Threshold:",
            distance * DISMISS_RATIO,
            "Dragged far:",
            draggedFar
          );
          const flicked = e.velocityY > FLICK_VELOCITY && translateY.value > FLICK_MIN_DISTANCE;
          if (draggedFar || flicked) {
            console.log("Dismissing, draggedFar:", draggedFar, "flicked:", flicked);
            runOnJS(animateClose)(cancelButtonIndex);
          } else {
            console.log("Not dismissing, draggedFar:", draggedFar, "flicked:", flicked);
            translateY.value = withTiming(0, { duration: 180 });
          }
        }),
    [scrollNativeGesture, cancelButtonIndex]
  );

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <Modal
      transparent
      visible
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => animateClose(cancelButtonIndex)}
    >
      <GestureHandlerRootView
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "flex-end" }}
      >
        <Animated.View
          pointerEvents={isClosing.current ? "none" : "auto"}
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.4)",
            },
            backdropStyle,
          ]}
        >
          <Pressable className="flex-1" onPress={() => animateClose(cancelButtonIndex)} />
        </Animated.View>
        <GestureDetector gesture={panGesture}>
          <Animated.View
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              if (h > 0 && sheetHeight.value === 0) {
                sheetHeight.value = h;
                translateY.value = h;
                translateY.value = withTiming(0, { duration: ANIM_MS });
              }
            }}
            className="bg-background-default rounded-t-2xl"
            style={[{ maxHeight, paddingBottom: insets.bottom }, sheetStyle]}
          >
            <View className="items-center py-3">
              <View className="w-10 h-1 rounded-full bg-border-prominent" />
            </View>
            {title && (
              <View className="px-4 py-3 border-b border-border-neutral">
                <Text className="text-sm text-center text-text-secondary">{title}</Text>
              </View>
            )}
            <GestureDetector gesture={scrollNativeGesture}>
              <Animated.ScrollView
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                bounces={false}
                overScrollMode="never"
                style={{ flexShrink: 1 }}
              >
                {options.map((label, index) => {
                  if (index === cancelButtonIndex) {
                    return null;
                  }
                  const isDestructive = index === destructiveButtonIndex;
                  return (
                    <Pressable
                      key={`${index}-${label}`}
                      className="px-4 py-4 border-b border-border-neutral"
                      onPress={() => animateClose(index)}
                    >
                      <Text className={`text-base ${isDestructive ? "text-text-error" : "text-text-primary"}`}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </Animated.ScrollView>
            </GestureDetector>
            <Pressable
              className="px-4 py-4 border-t border-border-neutral"
              onPress={() => animateClose(cancelButtonIndex)}
            >
              <Text className="text-base text-center text-text-secondary">
                {cancelButtonIndex != null ? options[cancelButtonIndex] : "Cancel"}
              </Text>
            </Pressable>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}
