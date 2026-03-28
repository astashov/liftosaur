import { useEffect, useState } from "react";
import type { JSX } from "react";
import { View, Text, Pressable } from "react-native";
import { IconPlay } from "./icons/IconPlay";
import { IconPause } from "./icons/IconPause";
import type { IHistoryRecord } from "@shared/types";
import { History_workoutTime, History_isPaused } from "@shared/models/history";
import { TimeUtils_formatHH, TimeUtils_formatMM } from "@shared/utils/time";
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";

interface IProps {
  progress: IHistoryRecord;
  onPauseResume: () => void;
}

export function WorkoutTimer(props: IProps): JSX.Element {
  const [, setTick] = useState(0);
  const isPaused = History_isPaused(props.progress.intervals);

  useEffect(() => {
    if (isPaused) {
      return;
    }
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isPaused]);

  const workoutTime = History_workoutTime(props.progress);
  const iconColor = Tailwind_semantic().text.secondary;
  return (
    <View className="flex-row items-center">
      <Pressable className="px-1" onPress={props.onPauseResume}>
        {isPaused ? <IconPlay color={iconColor} size={16} /> : <IconPause color={iconColor} size={16} />}
      </Pressable>
      <Text className={`text-sm font-semibold ${isPaused ? "text-text-error" : "text-text-success"}`}>
        {TimeUtils_formatHH(workoutTime)}:{TimeUtils_formatMM(workoutTime)} h
      </Text>
    </View>
  );
}
