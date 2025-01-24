import { JSX, h } from "preact";
import { IHistoryRecord, ISettings } from "../types";
import { useRef, useState } from "preact/hooks";
import { WorkoutShareOutput } from "./workoutShareOutput";
import { IconSpinner } from "./icons/iconSpinner";
import { ImageShareUtils } from "../utils/imageshare";

interface IWorkoutShareButtonProps {
  record?: IHistoryRecord;
  history: IHistoryRecord[];
  icon: JSX.Element;
  settings: ISettings;
}

export function WorkoutShareButton(props: IWorkoutShareButtonProps): JSX.Element {
  const workoutShareRef = useRef<HTMLDivElement>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  return (
    <div className="relative overflow-hidden text-left">
      <button
        className="w-10 h-10 rounded-full bg-grayv2-100 nm-workout-share-image"
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
      >
        {isLoading ? <IconSpinner width={20} height={20} /> : props.icon}
      </button>
      <div className="absolute" style={{ top: "9999px", left: "9999px" }}>
        <div ref={workoutShareRef} style={{ width: "420px" }}>
          <WorkoutShareOutput record={props.record} history={props.history} settings={props.settings} />
        </div>
      </div>
    </div>
  );
}
