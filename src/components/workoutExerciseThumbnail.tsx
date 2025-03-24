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

interface IWorkoutExerciseThumbnailProps {
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
  const firstLetters = exercise.name
    .split(/[_:*\s-]+/)
    .map((word) => word[0])
    .slice(0, 4)
    .join("");
  return (
    <button
      className={`cursor-pointer border ${borderColor} rounded-lg w-12 h-12 relative box-content`}
      style={{ borderWidth: isCurrent ? "2px" : "1px", padding: isCurrent ? "1px" : "2px", flex: "0 0 auto" }}
      data-cy={`workout-tab-${StringUtils.dashcase(exercise.name)}`}
      onClick={() => {
        updateProgress(props.dispatch, [lb<IHistoryRecord>().pi("ui").p("currentEntryIndex").record(entryIndex)]);
      }}
    >
      {ExerciseImageUtils.exists(entry.exercise, "small") ||
      ExerciseImageUtils.existsCustom(entry.exercise, "small", props.settings) ? (
        <ExerciseImage className="h-10" exerciseType={entry.exercise} size="small" settings={props.settings} />
      ) : (
        <div className="text-xl capitalize text-grayv3-500">{firstLetters}</div>
      )}
      {setsStatus !== "not-finished" && (
        <div className="absolute bottom-0 right-0" style={{ bottom: "2px", right: "2px" }}>
          <IconCheckCircle isChecked={true} size={14} color={WorkoutExerciseUtils.setsStatusToColor(setsStatus)} />
        </div>
      )}
    </button>
  );
}
