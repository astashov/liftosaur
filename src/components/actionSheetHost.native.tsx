import { JSX, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Modal, PanResponder, Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { ActionSheet_subscribe, IActionSheetRequest } from "../utils/actionSheet.native";

const ANIM_MS = 220;
const DISMISS_RATIO = 0.35;
const VELOCITY_THRESHOLD = 0.5;

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
  const translateY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetHeight = useRef(0);
  const isClosing = useRef(false);
  const pendingResult = useRef<number | undefined>(undefined);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: ANIM_MS, useNativeDriver: true }),
    ]).start();
  }, []);

  const animateClose = (buttonIndex: number | undefined): void => {
    if (isClosing.current) {
      return;
    }
    isClosing.current = true;
    pendingResult.current = buttonIndex;
    const distance = Math.max(sheetHeight.current, 1);
    Animated.parallel([
      Animated.timing(translateY, { toValue: distance, duration: ANIM_MS, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: ANIM_MS, useNativeDriver: true }),
    ]).start(() => {
      props.request.callback(pendingResult.current);
      props.onDismissed();
    });
  };

  const dragHandlers = useMemo(() => {
    const onMove = (_: unknown, gesture: { dy: number }): void => {
      if (gesture.dy > 0) {
        translateY.setValue(gesture.dy);
      }
    };
    const onRelease = (_: unknown, gesture: { dy: number; vy: number }): void => {
      const distance = Math.max(sheetHeight.current, 1);
      const shouldDismiss = gesture.dy > distance * DISMISS_RATIO || gesture.vy > VELOCITY_THRESHOLD;
      if (shouldDismiss) {
        animateClose(cancelButtonIndex);
      } else {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
      }
    };
    const onTerminate = (): void => {
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    };
    const handle = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: onMove,
      onPanResponderRelease: onRelease,
      onPanResponderTerminate: onTerminate,
    });
    const body = PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4 && g.dy > 0,
      onPanResponderMove: onMove,
      onPanResponderRelease: onRelease,
      onPanResponderTerminate: onTerminate,
    });
    return { handle: handle.panHandlers, body: body.panHandlers };
  }, [cancelButtonIndex]);

  return (
    <Modal transparent visible animationType="none" onRequestClose={() => animateClose(cancelButtonIndex)}>
      <View className="flex-1 justify-end">
        <Animated.View
          pointerEvents={isClosing.current ? "none" : "auto"}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            opacity: backdropOpacity,
          }}
        >
          <Pressable className="flex-1" onPress={() => animateClose(cancelButtonIndex)} />
        </Animated.View>
        <Animated.View
          {...dragHandlers.body}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && sheetHeight.current === 0) {
              sheetHeight.current = h;
              translateY.setValue(h);
              Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 2, speed: 14 }).start();
            }
          }}
          className="pb-8 bg-background-default rounded-t-2xl"
          style={{ transform: [{ translateY }] }}
        >
          <View {...dragHandlers.handle} className="items-center py-3">
            <View className="w-10 h-1 rounded-full bg-border-prominent" />
          </View>
          {title && (
            <View className="px-4 py-3 border-b border-border-neutral">
              <Text className="text-sm text-center text-text-secondary">{title}</Text>
            </View>
          )}
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
                <Text className={`text-base ${isDestructive ? "text-text-error" : "text-text-primary"}`}>{label}</Text>
              </Pressable>
            );
          })}
          <Pressable className="px-4 py-4" onPress={() => animateClose(cancelButtonIndex)}>
            <Text className="text-base text-center text-text-secondary">
              {cancelButtonIndex != null ? options[cancelButtonIndex] : "Cancel"}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
