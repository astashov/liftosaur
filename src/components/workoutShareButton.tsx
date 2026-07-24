import { JSX, useRef, useState } from "react";
import { View, Pressable } from "react-native";
import { IHistoryRecord, ISettings } from "../types";
import { WorkoutShareOutput } from "./workoutShareOutput";
import { IconSpinner } from "./icons/iconSpinner";
import { ImageShareUtils } from "../utils/imageshare";
import { Dialog_alert } from "../utils/dialog";

interface IWorkoutShareButtonProps {
  record?: IHistoryRecord;
  history: IHistoryRecord[];
  icon: JSX.Element;
  settings: ISettings;
}

export function WorkoutShareButton(props: IWorkoutShareButtonProps): JSX.Element {
  const workoutShareRef = useRef<View>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  return (
    <View className="relative overflow-hidden">
      <Pressable
        className="w-10 h-10 rounded-full bg-background-subtle items-center justify-center nm-workout-share-image"
        onPress={async () => {
          setIsLoading(true);
          try {
            const dataUrl = await ImageShareUtils.generateImageDataUrl(workoutShareRef.current!);
            const imageShare = new ImageShareUtils(dataUrl, "workout.png");
            setIsLoading(false);
            imageShare.shareOrDownload();
          } catch (e) {
            console.error(e);
            setIsLoading(false);
            Dialog_alert("Couldn't share the workout image");
          }
        }}
      >
        {isLoading ? <IconSpinner width={20} height={20} /> : props.icon}
      </Pressable>
      <View collapsable={false} className="absolute" style={{ left: -9999, top: -9999 }}>
        <View ref={workoutShareRef} collapsable={false} style={{ width: 420 }}>
          <WorkoutShareOutput record={props.record} history={props.history} settings={props.settings} />
        </View>
      </View>
    </View>
  );
}
