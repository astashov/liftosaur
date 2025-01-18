import { JSX, h } from "preact";
import { IHistoryRecord, ISettings } from "../types";
import { useRef, useState } from "preact/hooks";
import { WorkoutShareOutput } from "./workoutShareOutput";
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
  const workoutShareRef = useRef<HTMLDivElement>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  return (
    <div className="relative overflow-hidden text-left">
      <BottomSheetItem
        name="share-to-image"
        title="Share Image..."
        description={""}
        icon={isLoading ? <IconSpinner height={24} width={24} /> : <IconPicture size={24} />}
        onClick={async () => {
          setIsLoading(true);
          try {
            const dataUrl = await ImageShareUtils.generateImageDataUrl(workoutShareRef.current);
            const imageShare = new ImageShareUtils(dataUrl, "workout.png");
            setIsLoading(false);
            imageShare.shareOrDownload();
          } catch (e) {
            console.error(e);
            setIsLoading(false);
            alert("Couldn't share the workout image");
          }
        }}
      />
      <div className="absolute" style={{ top: "9999px", left: "9999px" }}>
        <div ref={workoutShareRef} style={{ width: "420px" }}>
          <WorkoutShareOutput history={props.history} record={props.record} settings={props.settings} />
        </div>
      </div>
    </div>
  );
}
