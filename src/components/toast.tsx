import { JSX, useCallback, useEffect, useRef } from "react";
import { Animated, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { lb } from "lens-shmens";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { IState, updateState } from "../models/state";

interface IProps {
  toast?: string;
  dispatch: IDispatch;
}

// App-level transient toast, driven by state.toast. Auto-dismisses; pointerEvents none so it never
// blocks taps. Rendered at the app root so it survives the navigation that follows the action.
export function Toast(props: IProps): JSX.Element | null {
  const { toast, dispatch } = props;
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const useNativeDriver = Platform.OS !== "web";

  const dismiss = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver }).start(() => {
      updateState(dispatch, [lb<IState>().p("toast").record(undefined)], "Dismiss toast");
    });
  }, [opacity, dispatch, useNativeDriver]);

  useEffect(() => {
    if (toast == null) {
      return;
    }
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver }).start();
    timerRef.current = setTimeout(dismiss, 2500);
    return () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [toast, opacity, useNativeDriver, dismiss]);

  if (toast == null) {
    return null;
  }

  return (
    // box-none: the full-width container passes taps through to the screen behind, but the pill
    // itself is tappable to dismiss immediately.
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: (insets.bottom || 12) + 16,
        alignItems: "center",
        opacity,
      }}
    >
      <Pressable
        className="px-4 py-3 rounded-xl bg-background-darkgray min-h-16 flex-row items-center justify-center opacity-95"
        style={{ width: "90%" }}
        data-testid="toast"
        testID="toast"
        onPress={dismiss}
      >
        <Text className="text-sm font-semibold text-center text-text-alwayswhite" numberOfLines={2}>
          {toast}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
