import { TimeUtils } from "../utils/time";
import { useEffect, useRef, useState } from "react";
import { IconPlay } from "./icons/iconPlay";
import { IconPause } from "./icons/iconPause";
import { IHistoryRecord } from "../types";
import { History } from "../models/history";
import { TouchableOpacity, View } from "react-native";
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

  const workoutTime = History.workoutTime(props.progress);
  const isPaused = History.isPaused(props.progress.intervals);
  return (
    <View style={{ marginLeft: -8 }}>
      {isPaused ? (
        <TouchableOpacity
          className="px-1 leading-none align-middle"
          style={{ marginTop: -2 }}
          onPress={props.onPauseResume}
        >
          <IconPlay color="#607284" size={16} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          className="px-1 leading-none align-middle"
          style={{ marginTop: -2 }}
          onPress={props.onPauseResume}
        >
          <IconPause color="#607284" size={16} />
        </TouchableOpacity>
      )}
      <LftText className={`leading-none align-middle ${isPaused ? "text-redv2-main" : "text-greenv2-main"}`}>
        {TimeUtils.formatHH(workoutTime)}
        <LftText className={isPaused ? "" : "blinking"}>:</LftText>
        {TimeUtils.formatMM(workoutTime)} h
      </LftText>
    </View>
  );
}
