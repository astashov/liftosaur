import { JSX, h } from "preact";
import { Exercise } from "../models/exercise";
import { Reps } from "../models/set";
import { IHistoryEntry, IHistoryRecord, ISettings } from "../types";
import { WorkoutExerciseUtils } from "../utils/workoutExerciseUtils";
import { ExerciseImage } from "./exerciseImage";
import { IconCheckCircle } from "./icons/iconCheckCircle";
import { StringUtils } from "../utils/string";
import { useRef } from "preact/hooks";
import { Tailwind } from "../utils/tailwindConfig";
import { ObjectUtils } from "../utils/object";

interface IWorkoutExerciseThumbnailProps {
  handleTouchStart?: (e: TouchEvent | MouseEvent) => void;
  onClick?: () => void;
  selectedIndex: number;
  colorToSupersetGroup: Partial<Record<string, IHistoryEntry[]>>;
  progress: IHistoryRecord;
  shouldShowProgress?: boolean;
  entry: IHistoryEntry;
  entryIndex: number;
  settings: ISettings;
}

export function WorkoutExerciseThumbnail(props: IWorkoutExerciseThumbnailProps): JSX.Element {
  const { entry, entryIndex } = props;
  const hasSupersets = Object.keys(props.colorToSupersetGroup).length > 0;
  const colorAndSupersetGroup = ObjectUtils.entries(props.colorToSupersetGroup).find(([_, entries]) => {
    return entries && entries.some((e) => e.id === entry.id);
  });
  const supersetColor = colorAndSupersetGroup ? colorAndSupersetGroup[0] : undefined;
  const setsStatus = Reps.setsStatus(entry.sets);
  const isCurrent = (props.progress.ui?.currentEntryIndex ?? 0) === entryIndex;
  const currentEntry = props.progress.entries[props.progress.ui?.currentEntryIndex ?? 0];
  const currentSuperset = currentEntry?.superset;
  const isCurrentSuperset = currentSuperset != null && currentSuperset === entry.superset;
  const borderColor = isCurrent ? "border-purple-600" : WorkoutExerciseUtils.setsStatusToBorderColor(setsStatus);
  const exercise = Exercise.get(entry.exercise, props.settings.exercises);
  const ref = useRef<HTMLButtonElement>(null);
  const totalSetsCount = entry.sets.length;
  const completedSetsCount = entry.sets.filter((set) => set.isCompleted).length;

  return (
    <div>
      <button
        ref={ref}
        onTouchStart={props.handleTouchStart}
        onMouseDown={props.handleTouchStart}
        onClick={props.onClick}
        data-name={`workout-exercise-tab-${entryIndex}`}
        className="align-middle bg-background-default"
        style={{ padding: "0 0.125rem" }}
      >
        <div
          className={`cursor-pointer border ${borderColor} bg-background-image rounded-lg w-12 h-12 relative box-content overflow-hidden text-ellipsis`}
          style={{
            borderWidth: isCurrent ? "2px" : "1px",
            margin: !isCurrent ? "0 1px" : "0",
            flex: "0 0 auto",
          }}
          data-is-selected={isCurrent}
          data-cy={`workout-tab-${StringUtils.dashcase(exercise.name)}`}
        >
          <ExerciseImage
            useTextForCustomExercise={true}
            className="h-10"
            exerciseType={entry.exercise}
            size="small"
            settings={props.settings}
          />
          {setsStatus === "not-finished" ? (
            props.shouldShowProgress && (
              <div
                className="absolute bottom-0 right-0 text-xs text-black"
                style={{ bottom: "0px", right: "0px", padding: "1px 3px" }}
              >
                <div className="absolute inset-0 rounded-md opacity-75 bg-lightgray-50" />
                <div className="relative z-10">
                  <strong className="font-semibold">{completedSetsCount}</strong>/
                  <strong className="font-semibold">{totalSetsCount}</strong>
                </div>
              </div>
            )
          ) : (
            <div className="absolute bottom-0 right-0" style={{ bottom: "2px", right: "2px" }}>
              <IconCheckCircle
                isChecked={true}
                size={14}
                color={WorkoutExerciseUtils.setsStatusToColor(setsStatus)}
                checkColor={Tailwind.colors().white}
              />
            </div>
          )}
        </div>
      </button>
      {supersetColor ? (
        <div className="mx-1">
          <div
            className="w-full"
            style={{
              backgroundColor: isCurrentSuperset ? supersetColor : Tailwind.semantic().background.neutral,
              height: "2px",
              marginTop: isCurrent ? "3px" : "5px",
            }}
          />
        </div>
      ) : hasSupersets ? (
        <div
          className="w-full"
          style={{ backgroundColor: "transparent", height: "2px", marginTop: isCurrent ? "3px" : "5px" }}
        />
      ) : null}
    </div>
  );
}
