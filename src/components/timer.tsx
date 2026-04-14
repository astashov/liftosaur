import { JSX, useEffect, useRef, useState } from "react";
import { View, Pressable, Animated } from "react-native";
import { Text } from "./primitives/text";
import { TimeUtils_formatHH, TimeUtils_formatMM } from "../utils/time";
import { IconPlay } from "./icons/iconPlay";
import { IconPause } from "./icons/iconPause";
import { IHistoryRecord } from "../types";
import { History_workoutTime, History_isPaused } from "../models/history";

interface IProps {
  progress: IHistoryRecord;
  onPauseResume: () => void;
}

export function Timer(props: IProps): JSX.Element {
  const intervalId = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [, setTick] = useState<number>(0);
  const blinkOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (intervalId.current != null) {
      clearInterval(intervalId.current);
    }
    intervalId.current = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => {
      if (intervalId.current != null) {
        clearInterval(intervalId.current);
      }
    };
  }, []);

  const workoutTime = History_workoutTime(props.progress);
  const isPaused = History_isPaused(props.progress.intervals);

  useEffect(() => {
    if (isPaused) {
      blinkOpacity.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkOpacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        Animated.timing(blinkOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [isPaused, blinkOpacity]);

  return (
    <View className="flex-row items-center" style={{ marginLeft: -8 }}>
      <Pressable className="px-1" onPress={props.onPauseResume}>
        {isPaused ? <IconPlay color="#607284" size={16} /> : <IconPause color="#607284" size={16} />}
      </Pressable>
      <Text className={isPaused ? "text-text-error" : "text-text-success"}>
        {TimeUtils_formatHH(workoutTime)}
        <Animated.Text style={{ opacity: blinkOpacity }}>:</Animated.Text>
        {TimeUtils_formatMM(workoutTime)} h
      </Text>
    </View>
  );
}
