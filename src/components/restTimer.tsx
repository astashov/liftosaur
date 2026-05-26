import { JSX, useEffect, useMemo, useRef, useState } from "react";
import { View, Pressable, Platform, Animated, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCustomKeyboardAnimatedHeight } from "../navigation/CustomKeyboardContext";
import { useActiveSheetHeight } from "../navigation/ActiveSheetHeightContext";
import { Text } from "./primitives/text";
import { TimeUtils_formatMMSS } from "../utils/time";
import { IDispatch } from "../ducks/types";
import { Thunk_playAudioNotification, Thunk_updateTimer } from "../ducks/thunks";
import { IconTrash } from "./icons/iconTrash";
import { IconBack } from "./icons/iconBack";
import { IHistoryRecord, ISettings, ISubscription } from "../types";
import { Reps_findNextEntryAndSetIndex } from "../models/set";
import { SendMessage_print } from "../utils/sendMessage";

interface IProps {
  progress: IHistoryRecord;
  dispatch: IDispatch;
  subscription: ISubscription;
  settings: ISettings;
}

const shadowStyle = Platform.select({
  ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 8 },
  android: { elevation: 8 },
  default: { boxShadow: "0px 0px 8px rgb(0 0 0 / 25%)" },
});

export function RestTimer(props: IProps): JSX.Element | null {
  const prevProps = useRef<IProps>(props);
  const sentNotification = useRef<boolean>(false);
  const intervalId = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [, setTick] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const insets = useSafeAreaInsets();
  const keyboardAnimatedHeight = useCustomKeyboardAnimatedHeight();
  const { height: windowHeight } = useWindowDimensions();
  const activeSheetHeight = useActiveSheetHeight();
  const sheetHidesTimer = activeSheetHeight > windowHeight * 0.5;
  const baseBottom = insets.bottom + 80;
  const targetBottom = Math.max(baseBottom, activeSheetHeight > 0 ? activeSheetHeight + 16 : 0);
  const animatedTargetBottom = useRef(new Animated.Value(targetBottom)).current;
  const animatedOpacity = useRef(new Animated.Value(1)).current;
  const wasHiddenRef = useRef(false);
  useEffect(() => {
    if (sheetHidesTimer) {
      animatedTargetBottom.setValue(targetBottom);
      animatedOpacity.setValue(0);
      wasHiddenRef.current = true;
    } else if (wasHiddenRef.current) {
      animatedTargetBottom.setValue(targetBottom);
      animatedOpacity.setValue(0);
      Animated.timing(animatedOpacity, { toValue: 1, duration: 200, useNativeDriver: false }).start();
      wasHiddenRef.current = false;
    } else {
      animatedOpacity.setValue(1);
      Animated.timing(animatedTargetBottom, {
        toValue: targetBottom,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [sheetHidesTimer, targetBottom, animatedTargetBottom, animatedOpacity]);
  const animatedBottom = useMemo(
    () => Animated.add(keyboardAnimatedHeight, animatedTargetBottom),
    [keyboardAnimatedHeight, animatedTargetBottom]
  );
  const { progress } = props;
  const { timer, timerSince } = progress;

  useEffect(() => {
    if (timerSince != null) {
      if (intervalId.current != null) {
        clearInterval(intervalId.current);
      }
      intervalId.current = setInterval(() => {
        setTick((t) => t + 1);
      }, 1000);
      const timeDifference = Date.now() - timerSince;
      const timerMs = timer != null ? timer * 1000 : 0;
      // Only play notification within 5s of completion; avoids repeat plays when syncing from another device past the threshold
      const maxNotificationWindowMs = 5000;
      if (
        timer != null &&
        timeDifference > timerMs &&
        timeDifference <= timerMs + maxNotificationWindowMs &&
        !sentNotification.current
      ) {
        if (!progress.ui?.nativeNotificationScheduled) {
          SendMessage_print(`Main app: Playing web app notification`);
          props.dispatch(Thunk_playAudioNotification());
        } else {
          SendMessage_print(`Main app: Not playing web app notification`);
        }
        sentNotification.current = true;
      } else if (timer != null && timeDifference > timerMs + maxNotificationWindowMs) {
        sentNotification.current = true;
      }
      if (prevProps.current.progress.timerSince !== props.progress.timerSince) {
        sentNotification.current = false;
      }
    }
    prevProps.current = props;
    return () => {
      if (intervalId.current != null) {
        clearInterval(intervalId.current);
      }
    };
  });

  if (timer == null || timerSince == null) {
    return null;
  }
  const pointerEventsMode = sheetHidesTimer ? "none" : "box-none";

  const timeDifference = Date.now() - timerSince;
  const isTimeOut = timeDifference > timer * 1000;
  const bgClass = isTimeOut ? "bg-background-darkred" : "bg-background-darkgray";
  const totalColorClass = isTimeOut ? "text-white" : "text-gray-300";
  const nextEntryAndSetIndex =
    progress.timerEntryIndex != null && progress.timerMode != null
      ? Reps_findNextEntryAndSetIndex(progress, progress.timerEntryIndex, progress.timerMode)
      : undefined;
  if (isExpanded) {
    return (
      <Animated.View
        style={[
          { position: "absolute", left: 16, right: 16, bottom: animatedBottom, zIndex: 30, opacity: animatedOpacity },
        ]}
        pointerEvents={pointerEventsMode}
      >
        <View className={`flex-row ${bgClass} rounded-lg`} style={shadowStyle}>
          <Pressable
            data-testid="rest-timer-minus"
            testID="rest-timer-minus"
            className="relative items-center justify-center m-2"
            style={{ width: 40, minHeight: 40 }}
            onPress={() =>
              props.dispatch(
                Thunk_updateTimer(timer - 15, nextEntryAndSetIndex?.entryIndex, nextEntryAndSetIndex?.setIndex, false)
              )
            }
          >
            <View className="absolute inset-0 rounded-lg bg-background-default" style={{ opacity: 0.2 }} />
            <Text className="font-bold text-text-alwayswhite">-15s</Text>
          </Pressable>
          <Pressable
            data-testid="rest-timer-cancel"
            testID="rest-timer-cancel"
            className="relative items-center justify-center my-2"
            style={{ width: 40, minHeight: 40 }}
            onPress={() => props.dispatch({ type: "StopTimer" })}
          >
            <View className="absolute inset-0 rounded-lg bg-background-default" style={{ opacity: 0.2 }} />
            <IconTrash color="white" />
          </Pressable>
          <Pressable
            data-testid="rest-timer-expanded"
            testID="rest-timer-expanded"
            className="items-center justify-center flex-1"
            onPress={() => setIsExpanded(false)}
          >
            <Text data-testid="rest-timer-current" className="font-bold text-text-alwayswhite">
              {TimeUtils_formatMMSS(timeDifference)}
            </Text>
            <Text data-testid="rest-timer-total" className={`text-xs ${totalColorClass}`}>
              {TimeUtils_formatMMSS(timer * 1000)}
            </Text>
          </Pressable>
          <Pressable
            data-testid="rest-timer-back"
            testID="rest-timer-back"
            className="relative items-center justify-center my-2"
            style={{ width: 40, minHeight: 40 }}
            onPress={() => setIsExpanded(false)}
          >
            <View className="absolute inset-0 rounded-lg bg-background-default" style={{ opacity: 0.2 }} />
            <View style={{ transform: [{ rotate: "180deg" }] }}>
              <IconBack color="white" />
            </View>
          </Pressable>
          <Pressable
            data-testid="rest-timer-plus"
            testID="rest-timer-plus"
            className="relative items-center justify-center m-2"
            style={{ width: 40, minHeight: 40 }}
            onPress={() =>
              props.dispatch(
                Thunk_updateTimer(timer + 15, nextEntryAndSetIndex?.entryIndex, nextEntryAndSetIndex?.setIndex, false)
              )
            }
          >
            <View className="absolute inset-0 rounded-lg bg-background-default" style={{ opacity: 0.2 }} />
            <Text className="font-bold text-text-alwayswhite">+15s</Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[{ position: "absolute", right: 16, bottom: animatedBottom, zIndex: 30, opacity: animatedOpacity }]}
      pointerEvents={pointerEventsMode}
    >
      <Pressable
        data-testid="rest-timer-collapsed"
        testID="rest-timer-collapsed"
        onPress={() => setIsExpanded(true)}
        className={`${bgClass} items-center px-2 py-2 rounded-lg`}
        style={[{ minWidth: 64 }, shadowStyle]}
      >
        <Text
          data-testid="rest-timer-current"
          numberOfLines={1}
          className="font-bold text-text-alwayswhite whitespace-nowrap"
        >
          {TimeUtils_formatMMSS(timeDifference)}
        </Text>
        <Text
          data-testid="rest-timer-total"
          numberOfLines={1}
          className={`text-xs ${totalColorClass} whitespace-nowrap`}
        >
          {TimeUtils_formatMMSS(timer * 1000)}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
