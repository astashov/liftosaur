import { JSX, useState } from "react";
import { View, Image } from "react-native";
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
  const height = props.type === "igfeed" ? width : (width * 16) / 9;
  const [multiplier, setMultiplier] = useState(1.0);

  return (
    <View className="relative bg-text-primary" style={{ width, height }}>
      {props.backgroundImage ? (
        <Image
          source={{ uri: props.backgroundImage }}
          className="absolute top-0 left-0"
          style={{ width, height }}
          resizeMode="contain"
        />
      ) : null}
      <View
        className="absolute left-0"
        style={{
          right: props.type === "tiktok" ? 60 : 0,
          bottom: props.type === "tiktok" ? 82 : 0,
        }}
      >
        <View
          style={{
            width,
            transform: [{ translateX: 210 - multiplier * 210 }, { scale: multiplier }],
            transformOrigin: "bottom left",
          }}
        >
          <View
            onLayout={(e) => {
              const workoutHeight = e.nativeEvent.layout.height;
              if (workoutHeight > 0) {
                const newMultiplier = Math.min(1.0, (height * 0.9) / workoutHeight);
                if (Math.abs(newMultiplier - multiplier) > 0.001) {
                  setMultiplier(newMultiplier);
                }
              }
            }}
          >
            <WorkoutShareOutput history={props.history} record={props.record} settings={props.settings} />
          </View>
        </View>
      </View>
    </View>
  );
}
