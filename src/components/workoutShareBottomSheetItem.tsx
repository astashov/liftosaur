import { JSX, useRef, useState } from "react";
import { View } from "react-native";
import { IHistoryRecord, ISettings } from "../types";
import { WorkoutShareOutput } from "./workoutShareOutput";
import { Dialog_alert } from "../utils/dialog";
import { IconSpinner } from "./icons/iconSpinner";
import { ImageShareUtils } from "../utils/imageshare";
import { BottomSheetItem } from "./bottomSheetItem";
import { IconPicture } from "./icons/iconPicture";

interface IWorkoutShareBottomSheetItemProps {
  record?: IHistoryRecord;
  history: IHistoryRecord[];
  settings: ISettings;
}

export function WorkoutShareBottomSheetItem(props: IWorkoutShareBottomSheetItemProps): JSX.Element {
  const workoutShareRef = useRef<View>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  return (
    <View className="relative overflow-hidden">
      <BottomSheetItem
        name="share-to-image"
        title="Share Image..."
        description={""}
        icon={isLoading ? <IconSpinner height={24} width={24} /> : <IconPicture size={24} />}
        onClick={async () => {
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
      />
      <View collapsable={false} className="absolute" style={{ left: -9999, top: -9999 }}>
        <View ref={workoutShareRef} collapsable={false} style={{ width: 420 }}>
          <WorkoutShareOutput history={props.history} record={props.record} settings={props.settings} />
        </View>
      </View>
    </View>
  );
}
