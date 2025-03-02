import { JSX, h } from "preact";
import { IHistoryRecord, ISettings } from "../types";
import { WorkoutShareOutput } from "./workoutShareOutput";
import { useEffect, useRef, useState } from "preact/hooks";

interface IWorkoutShareOutputWithBgProps {
  record?: IHistoryRecord;
  history: IHistoryRecord[];
  type: "igstory" | "igfeed" | "tiktok";
  settings: ISettings;
  backgroundImage?: string;
}

export function WorkoutShareOutputWithBg(props: IWorkoutShareOutputWithBgProps): JSX.Element {
  const width = 420;
  const height = props.type === "igfeed" ? width : (width * 16) / 9;
  const workoutRef = useRef<HTMLDivElement>(null);
  const [multiplier, setMultiplier] = useState(1.0);

  useEffect(() => {
    const workoutHeight = workoutRef.current?.clientHeight || 0;
    const newMultiplier = Math.min(1.0, (height * 0.9) / workoutHeight);
    setMultiplier(newMultiplier);
  }, []);

  return (
    <div
      className="relative bg-black"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundImage: `url(${props.backgroundImage})`,
        backgroundSize: "contain",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div
        className="absolute left-0"
        style={{
          right: props.type === "tiktok" ? "60px" : "0",
          bottom: props.type === "tiktok" ? "82px" : "0",
        }}
      >
        <div
          style={{
            width,
            transform: `scale(${multiplier}) translateX(${210 - multiplier * 210}px)`,
            transformOrigin: "bottom left",
          }}
        >
          <div ref={workoutRef}>
            <WorkoutShareOutput history={props.history} record={props.record} settings={props.settings} />
          </div>
        </div>
      </div>
    </div>
  );
}
