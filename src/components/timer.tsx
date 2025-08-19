import { JSX, h } from "preact";
import { TimeUtils } from "../utils/time";
import { useEffect, useRef, useState } from "preact/hooks";
import { IconPlay } from "./icons/iconPlay";
import { IconPause } from "./icons/iconPause";
import { IHistoryRecord } from "../types";
import { History } from "../models/history";

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
    <span style={{ marginLeft: "-0.5rem" }}>
      {isPaused ? (
        <button className="px-1 leading-none align-middle" style={{ marginTop: "-2px" }} onClick={props.onPauseResume}>
          <IconPlay color="#607284" size={16} />
        </button>
      ) : (
        <button className="px-1 leading-none align-middle" style={{ marginTop: "-2px" }} onClick={props.onPauseResume}>
          <IconPause color="#607284" size={16} />
        </button>
      )}
      <span className={`leading-none align-middle ${isPaused ? "text-text-error" : "text-text-success"}`}>
        {TimeUtils.formatHH(workoutTime)}
        <span className={isPaused ? "" : "blinking"}>:</span>
        {TimeUtils.formatMM(workoutTime)} h
      </span>
    </span>
  );
}
