import { JSX, h } from "preact";
import { IHistoryRecord, ISettings } from "../types";
import { WorkoutShareOutput } from "./workoutShareOutput";

interface IWorkoutShareOutputWithBgProps {
  record?: IHistoryRecord;
  history: IHistoryRecord[];
  type: "igstory" | "igfeed" | "tiktok";
  settings: ISettings;
  backgroundImage?: string;
}

export function WorkoutShareOutputWithBg(props: IWorkoutShareOutputWithBgProps): JSX.Element {
  const width = 420;
  const height = (width * 16) / 9;
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
        <WorkoutShareOutput history={props.history} record={props.record} settings={props.settings} />
      </div>
    </div>
  );
}
