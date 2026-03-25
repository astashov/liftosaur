import { useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import { View, Text, Pressable } from "react-native";
import { IconPlay } from "./icons/IconPlay";
import { IconPause } from "./icons/IconPause";
import type { IHistoryRecord } from "@shared/types";
import { History_workoutTime, History_isPaused } from "@shared/models/history";
import { TimeUtils_formatHH, TimeUtils_formatMM } from "@shared/utils/time";

interface IProps {
  progress: IHistoryRecord;
  onPauseResume: () => void;
}

export function WorkoutTimer(props: IProps): JSX.Element {
  const intervalId = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [, setTick] = useState(0);

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
  return (
    <View className="flex-row items-center">
      <Pressable className="px-1" onPress={props.onPauseResume}>
        {isPaused ? <IconPlay color="#607284" size={16} /> : <IconPause color="#607284" size={16} />}
      </Pressable>
      <Text className={isPaused ? "text-text-error" : "text-text-success"}>
        {TimeUtils_formatHH(workoutTime)}:{TimeUtils_formatMM(workoutTime)} h
      </Text>
    </View>
  );
}
