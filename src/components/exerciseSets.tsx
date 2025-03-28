import { h, JSX, Fragment } from "preact";
import { useCallback } from "preact/hooks";
import { IDispatch } from "../ducks/types";
import { EditProgressEntry } from "../models/editProgressEntry";
import { Progress } from "../models/progress";
import {
  ISet,
  IHistoryRecord,
  ISettings,
  IHistoryEntry,
  IProgressMode,
  IDayData,
  IExerciseType,
  IProgramState,
} from "../types";
import { ExerciseSetView } from "./exerciseSet";
import { IconCloseCircle } from "./icons/iconCloseCircle";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";
import { IByExercise, IByTag } from "../pages/planner/plannerEvaluator";

type IOnStartSetChanging = (
  isWarmup: boolean,
  entryIndex: number,
  setIndex?: number,
  programExercise?: IPlannerProgramExercise,
  exerciseType?: IExerciseType
) => void;

interface IExerciseSetsProps {
  isEditMode: boolean;
  warmupSets: ISet[];
  index: number;
  dayData: IDayData;
  size?: "small" | "medium";
  progress: IHistoryRecord;
  programExercise?: IPlannerProgramExercise;
  otherStates?: IByTag<IProgramState>;
  showHelp: boolean;
  settings: ISettings;
  entry: IHistoryEntry;
  onStartSetChanging?: IOnStartSetChanging;
  onChangeReps: (mode: IProgressMode, entryIndex: number, setIndex: number) => void;
  dispatch: IDispatch;
}

export function ExerciseSets(props: IExerciseSetsProps): JSX.Element {
  const { isEditMode, warmupSets } = props;
  const isCurrentProgress = Progress.isCurrent(props.progress);
  const quickAddSets = props.programExercise
    ? PlannerProgramExercise.sets(props.programExercise).some((set) => !!set.repRange?.isQuickAddSet)
    : undefined;

  const onStartSetChanging = props.onStartSetChanging;

  return (
    <>
      {(isEditMode || warmupSets?.length > 0) && (
        <Fragment>
          {warmupSets.map((set, setIndex) => {
            return (
              <ExerciseSetContainer
                size={props.size || "medium"}
                mode="warmup"
                label="Warmup"
                isEditMode={isEditMode}
                entryIndex={props.index}
                setIndex={setIndex}
                progress={props.progress}
                settings={props.settings}
                entry={props.entry}
                showHelp={
                  props.showHelp && props.index === 0 && setIndex === 0 && Progress.isFullyEmptySet(props.progress)
                }
                set={set}
                isCurrentProgress={!!isCurrentProgress}
                onLongPress={
                  onStartSetChanging &&
                  (() => onStartSetChanging(true, props.index, setIndex, props.programExercise, props.entry.exercise))
                }
                onClick={useCallback(() => {
                  if (isEditMode && onStartSetChanging) {
                    onStartSetChanging(true, props.index, setIndex, props.programExercise, props.entry.exercise);
                  } else {
                    handleClick(
                      props.dispatch,
                      props.index,
                      setIndex,
                      "warmup",
                      props.programExercise,
                      props.otherStates
                    );
                    props.onChangeReps("warmup", props.index, setIndex);
                  }
                }, [isEditMode, props.index, props.entry, props.dispatch])}
                dispatch={props.dispatch}
              />
            );
          })}
          {isEditMode && onStartSetChanging && (
            <AddSetButton
              onClick={() => {
                onStartSetChanging!(true, props.index, undefined, props.programExercise, props.entry.exercise);
              }}
              size={props.size || "medium"}
              label="Warmup"
              mode="warmup"
            />
          )}
          <div
            style={{
              width: "1px",
              marginTop: "21px",
              marginBottom: "0",
            }}
            className={`${props.size === "small" ? "h-8 mt-1 mr-1" : "h-10 mr-2"} bg-grayv2-400`}
          ></div>
        </Fragment>
      )}
      {props.entry.sets.map((set, setIndex) => {
        return (
          <ExerciseSetContainer
            size={props.size || "medium"}
            mode="workout"
            label={set.label}
            isEditMode={isEditMode}
            entryIndex={props.index}
            setIndex={setIndex}
            progress={props.progress}
            settings={props.settings}
            entry={props.entry}
            showHelp={
              props.showHelp &&
              (warmupSets?.length || 0) === 0 &&
              props.index === 0 &&
              setIndex === 0 &&
              Progress.isFullyEmptySet(props.progress)
            }
            set={set}
            isCurrentProgress={!!isCurrentProgress}
            onLongPress={
              onStartSetChanging &&
              (() => onStartSetChanging(false, props.index, setIndex, props.programExercise, props.entry.exercise))
            }
            onClick={useCallback(() => {
              if (isEditMode && onStartSetChanging) {
                onStartSetChanging(false, props.index, setIndex, props.programExercise, props.entry.exercise);
              } else {
                handleClick(props.dispatch, props.index, setIndex, "workout", props.programExercise, props.otherStates);
                props.onChangeReps("workout", props.index, setIndex);
              }
            }, [isEditMode, props.index, props.entry, props.dispatch])}
            dispatch={props.dispatch}
          />
        );
      })}
      {(isEditMode || (Progress.isCurrent(props.progress) && !props.programExercise) || quickAddSets) &&
        onStartSetChanging && (
          <AddSetButton
            size={props.size || "medium"}
            quickAddSets={!isEditMode && quickAddSets}
            onClick={() =>
              onStartSetChanging!(false, props.index, undefined, props.programExercise, props.entry.exercise)
            }
            mode="workout"
          />
        )}
    </>
  );
}

interface IExerciseSetContainerProps {
  size: "small" | "medium";
  mode: "workout" | "warmup";
  label?: string;
  isEditMode: boolean;
  entryIndex: number;
  setIndex: number;
  progress: IHistoryRecord;
  settings: ISettings;
  entry: IHistoryEntry;
  showHelp: boolean;
  set: ISet;
  isCurrentProgress: boolean;
  onClick: () => void;
  onLongPress?: () => void;
  dispatch: IDispatch;
}

function ExerciseSetContainer(props: IExerciseSetContainerProps): JSX.Element {
  const { isEditMode, set, isCurrentProgress } = props;
  return (
    <div data-cy={`${props.mode}-set`} className={`${props.size === "small" ? "mr-1 mb-1" : "mr-2 mb-2"}`}>
      <div
        data-cy={`${props.mode}-set-title`}
        className="leading-none text-center text-grayv2-main"
        style={{
          fontSize: props.size === "small" ? "9px" : "10px",
          marginTop:
            (set.isAmrap && set.completedReps != null) || set.completedRpe != null || set.rpe != null ? "0px" : "5px",
          marginBottom:
            (set.isAmrap && set.completedReps != null) || set.completedRpe != null || set.rpe != null ? "8px" : "3px",
          minHeight: props.size === "small" ? "9px" : "10px",
        }}
      >
        {props.label ?? " "}
      </div>
      <div className={`relative ${isEditMode ? "is-edit-mode" : ""}`}>
        <ExerciseSetView
          showHelp={props.showHelp}
          settings={props.settings}
          exercise={props.entry.exercise}
          size={props.size}
          isCurrent={!!isCurrentProgress}
          set={set}
          isEditMode={isEditMode}
          onLongPress={props.onLongPress}
          onClick={(e) => {
            e.preventDefault();
            props.onClick();
          }}
        />
        {isEditMode && (
          <button
            data-cy="set-edit-mode-remove"
            style={{ top: "-12px", left: "-13px" }}
            className="absolute z-10 p-1 ls-edit-set-remove nm-edit-set-remove"
            onClick={() => {
              EditProgressEntry.removeSet(
                props.dispatch,
                props.progress.id,
                props.mode === "warmup",
                props.entryIndex,
                props.setIndex
              );
            }}
          >
            <IconCloseCircle />
          </button>
        )}
      </div>
    </div>
  );
}

interface IAddSetButtonProps {
  label?: string;
  mode: "workout" | "warmup";
  onClick: () => void;
  size: "small" | "medium";
  quickAddSets?: boolean;
}

function AddSetButton(props: IAddSetButtonProps): JSX.Element {
  const sizeClassNames = props.size === "small" ? "w-10 h-10 text-xs" : "w-12 h-12";
  return (
    <div className="mb-2 mr-2">
      <div
        data-cy={`${props.mode}-set-title`}
        className="leading-none text-center text-grayv2-main"
        style={{
          fontSize: props.size === "small" ? "9px" : "10px",
          marginBottom: "8px",
          minHeight: props.size === "small" ? "9px" : "10px",
        }}
      >
        {props.label ?? " "}
      </div>
      <button
        data-cy={`add-${props.mode}-set`}
        onClick={props.onClick}
        className={`${sizeClassNames} leading-7 text-center border border-gray-400 border-dashed rounded-lg bg-grayv2-100 ls-edit-set-open-modal-add-warmup nm-edit-set-open-modal-add-warmup ${
          props.quickAddSets ? "" : "is-edit-mode"
        }`}
      >
        +
      </button>
    </div>
  );
}

function handleClick(
  dispatch: IDispatch,
  entryIndex: number,
  setIndex: number,
  mode: IProgressMode,
  programExercise?: IPlannerProgramExercise,
  otherStates?: IByExercise<IProgramState>
): void {
  dispatch({ type: "ChangeRepsAction", entryIndex, setIndex, programExercise, otherStates, mode });
}
