import { TimeUtils } from "../utils/time";
import { useEffect, useRef, useState } from "react";
import { IconPlay } from "./icons/iconPlay";
import { IconPause } from "./icons/iconPause";
import { IHistoryRecord } from "../types";
import { History } from "../models/history";
import { Animated, TouchableOpacity, View } from "react-native";
import { LftText } from "./lftText";

interface IProps {
  progress: IHistoryRecord;
  onPauseResume: () => void;
}

export function Timer(props: IProps): JSX.Element {
  const intervalId = useRef<number | undefined>(undefined);
  const [tick, setTick] = useState<number>(0);

  useEffect(() => {
    if (intervalId != null) {
      window.clearInterval(intervalId.current);
    }
    intervalId.current = window.setInterval(() => {
      setTick(tick + 1);
    }, 1000);
    return () => {
      if (intervalId != null) {
        window.clearInterval(intervalId.current);
      }
    };
  });

  const blinkOpacity = useRef(new Animated.Value(1)).current;
  const isPaused = History.isPaused(props.progress.intervals);
  useEffect(() => {
    // Blinking animation
    if (isPaused) {
      blinkOpacity.setValue(1);
      return;
    } else {
      const blinking = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkOpacity, {
            toValue: 0, // Fade out
            duration: 500, // Duration of fade out
            useNativeDriver: true, // Use native driver for better performance
          }),
          Animated.timing(blinkOpacity, {
            toValue: 1, // Fade in
            duration: 500, // Duration of fade in
            useNativeDriver: true,
          }),
        ])
      );

      blinking.start();
      return () => blinking.stop();
    }
  }, [isPaused, blinkOpacity]);

  const workoutTime = History.workoutTime(props.progress);
  return (
    <View className="flex-row items-center justify-center">
      {isPaused ? (
        <TouchableOpacity
          className="px-1 leading-6 align-middle"
          style={{ marginTop: -2 }}
          onPress={props.onPauseResume}
        >
          <IconPlay color="#607284" size={16} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          className="px-1 leading-6 align-middle"
          style={{ marginTop: -2 }}
          onPress={props.onPauseResume}
        >
          <IconPause color="#607284" size={16} />
        </TouchableOpacity>
      )}
      <View className={`leading-6 flex-row`}>
        <LftText className={`font-bold ${isPaused ? "text-redv2-main" : "text-greenv2-main"}`}>
          {TimeUtils.formatHH(workoutTime)}
        </LftText>
        <Animated.Text
          style={{ opacity: blinkOpacity }}
          className={`font-bold ${isPaused ? "text-redv2-main" : "text-greenv2-main"}`}
        >
          :
        </Animated.Text>
        <LftText className={`font-bold ${isPaused ? "text-redv2-main" : "text-greenv2-main"}`}>
          {TimeUtils.formatMM(workoutTime)} h
        </LftText>
      </View>
    </View>
  );
}
