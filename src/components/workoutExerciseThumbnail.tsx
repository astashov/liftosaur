import { lb } from "lens-shmens";
import { JSX, h } from "preact";
import { IDispatch } from "../ducks/types";
import { Exercise } from "../models/exercise";
import { ExerciseImageUtils } from "../models/exerciseImage";
import { Reps } from "../models/set";
import { updateProgress } from "../models/state";
import { IHistoryEntry, IHistoryRecord, ISettings } from "../types";
import { WorkoutExerciseUtils } from "../utils/workoutExerciseUtils";
import { ExerciseImage } from "./exerciseImage";
import { IconCheckCircle } from "./icons/iconCheckCircle";
import { StringUtils } from "../utils/string";
import { useEffect, useRef } from "preact/hooks";

interface IWorkoutExerciseThumbnailProps {
  selectedIndex: number;
  progress: IHistoryRecord;
  entry: IHistoryEntry;
  entryIndex: number;
  settings: ISettings;
  dispatch: IDispatch;
}

export function WorkoutExerciseThumbnail(props: IWorkoutExerciseThumbnailProps): JSX.Element {
  const { entry, entryIndex } = props;
  const setsStatus = Reps.setsStatus(entry.sets);
  const isCurrent = (props.progress.ui?.currentEntryIndex ?? 0) === entryIndex;
  const borderColor = isCurrent ? "border-purplev3-main" : WorkoutExerciseUtils.setsStatusToBorderColor(setsStatus);
  const exercise = Exercise.get(entry.exercise, props.settings.exercises);
  const ref = useRef<HTMLButtonElement>(null);
  const totalSetsCount = entry.sets.length;
  const completedSetsCount = entry.sets.filter((set) => set.isCompleted).length;

  useEffect(() => {
    if (props.entryIndex === props.selectedIndex && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [props.selectedIndex]);

  return (
    <button
      ref={ref}
      className={`cursor-pointer border ${borderColor} rounded-lg w-12 h-12 relative box-content overflow-hidden text-ellipsis`}
      style={{ borderWidth: isCurrent ? "2px" : "1px", margin: !isCurrent ? "0 1px" : "0", flex: "0 0 auto" }}
      data-cy={`workout-tab-${StringUtils.dashcase(exercise.name)}`}
      onClick={() => {
        updateProgress(props.dispatch, [lb<IHistoryRecord>().pi("ui").p("currentEntryIndex").record(entryIndex)]);
      }}
    >
      {ExerciseImageUtils.exists(entry.exercise, "small") ||
      ExerciseImageUtils.existsCustom(entry.exercise, "small", props.settings) ? (
        <ExerciseImage className="h-10" exerciseType={entry.exercise} size="small" settings={props.settings} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-start text-xs text-left bg-white text-grayv3-500">
          <div
            className="flex items-stretch justify-start w-full h-full p-1 leading-3 fade-mask"
            style={{ fontSize: "0.7rem" }}
          >
            {Exercise.nameWithEquipment(exercise, props.settings)}
          </div>
        </div>
      )}
      {setsStatus === "not-finished" ? (
        <div
          className="absolute bottom-0 right-0 text-xs"
          style={{ bottom: "0px", right: "0px", padding: "1px 3px", background: "rgba(255, 255, 255, 0.75)" }}
        >
          <strong className="font-semibold">{completedSetsCount}</strong>/
          <strong className="font-semibold">{totalSetsCount}</strong>
        </div>
      ) : (
        <div className="absolute bottom-0 right-0" style={{ bottom: "2px", right: "2px" }}>
          <IconCheckCircle isChecked={true} size={14} color={WorkoutExerciseUtils.setsStatusToColor(setsStatus)} />
        </div>
      )}
    </button>
  );
}
