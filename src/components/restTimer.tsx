import { JSX, useEffect, useRef, useState } from "react";
import { View, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

  const timeDifference = Date.now() - timerSince;
  const isTimeOut = timeDifference > timer * 1000;
  const bgClass = isTimeOut ? "bg-background-darkred" : "bg-background-darkgray";
  const totalColorClass = isTimeOut ? "text-white" : "text-gray-300";
  const nextEntryAndSetIndex =
    progress.timerEntryIndex != null && progress.timerMode != null
      ? Reps_findNextEntryAndSetIndex(progress, progress.timerEntryIndex, progress.timerMode)
      : undefined;
  const bottom = insets.bottom + 80;

  if (isExpanded) {
    return (
      <View style={[{ position: "absolute", left: 16, right: 16, bottom, zIndex: 30 }]} pointerEvents="box-none">
        <View className={`flex-row ${bgClass} rounded-lg`} style={shadowStyle}>
          <Pressable
            data-cy="rest-timer-minus" data-testid="rest-timer-minus"
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
            data-cy="rest-timer-cancel" data-testid="rest-timer-cancel"
            testID="rest-timer-cancel"
            className="relative items-center justify-center my-2"
            style={{ width: 40, minHeight: 40 }}
            onPress={() => props.dispatch({ type: "StopTimer" })}
          >
            <View className="absolute inset-0 rounded-lg bg-background-default" style={{ opacity: 0.2 }} />
            <IconTrash color="white" />
          </Pressable>
          <Pressable
            data-cy="rest-timer-expanded" data-testid="rest-timer-expanded"
            testID="rest-timer-expanded"
            className="flex-1 items-center justify-center"
            onPress={() => setIsExpanded(false)}
          >
            <Text data-cy="rest-timer-current" data-testid="rest-timer-current" className="font-bold text-text-alwayswhite">
              {TimeUtils_formatMMSS(timeDifference)}
            </Text>
            <Text data-cy="rest-timer-total" data-testid="rest-timer-total" className={`text-xs ${totalColorClass}`}>
              {TimeUtils_formatMMSS(timer * 1000)}
            </Text>
          </Pressable>
          <Pressable
            data-cy="rest-timer-back" data-testid="rest-timer-back"
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
            data-cy="rest-timer-plus" data-testid="rest-timer-plus"
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
      </View>
    );
  }

  return (
    <View style={[{ position: "absolute", right: 16, bottom, zIndex: 30 }]} pointerEvents="box-none">
      <Pressable
        data-cy="rest-timer-collapsed" data-testid="rest-timer-collapsed"
        testID="rest-timer-collapsed"
        onPress={() => setIsExpanded(true)}
        className={`${bgClass} items-center px-2 py-2 rounded-lg`}
        style={[{ width: 64 }, shadowStyle]}
      >
        <Text data-cy="rest-timer-current" data-testid="rest-timer-current" className="font-bold text-text-alwayswhite">
          {TimeUtils_formatMMSS(timeDifference)}
        </Text>
        <Text data-cy="rest-timer-total" data-testid="rest-timer-total" className={`text-xs ${totalColorClass}`}>
          {TimeUtils_formatMMSS(timer * 1000)}
        </Text>
      </Pressable>
    </View>
  );
}
