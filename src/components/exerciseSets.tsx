import { h, JSX, Fragment } from "preact";
import { useCallback } from "preact/hooks";
import { IDispatch } from "../ducks/types";
import { EditProgressEntry } from "../models/editProgressEntry";
import { ProgramExercise } from "../models/programExercise";
import { Progress } from "../models/progress";
import { IFriendUser } from "../models/state";
import { ISet, IHistoryRecord, ISettings, IHistoryEntry, IProgressMode, IProgramExercise, IEquipment } from "../types";
import { ExerciseSetView } from "./exerciseSet";
import { IconCloseCircle } from "./icons/iconCloseCircle";

interface IExerciseSetsProps {
  isEditMode: boolean;
  warmupSets: ISet[];
  index: number;
  size?: "small" | "medium";
  progress: IHistoryRecord;
  programExercise?: IProgramExercise;
  allProgramExercises?: IProgramExercise[];
  showHelp: boolean;
  settings: ISettings;
  entry: IHistoryEntry;
  friend?: IFriendUser;
  onStartSetChanging?: (
    isWarmup: boolean,
    entryIndex: number,
    setIndex?: number,
    programExercise?: IProgramExercise,
    equipment?: IEquipment
  ) => void;
  onChangeReps: (mode: IProgressMode, entryIndex: number, setIndex: number) => void;
  dispatch: IDispatch;
}

export function ExerciseSets(props: IExerciseSetsProps): JSX.Element {
  const { isEditMode, warmupSets, friend } = props;
  const isCurrentProgress = Progress.isCurrent(props.progress);
  const quickAddSets = props.programExercise
    ? ProgramExercise.getQuickAddSets(props.programExercise, props.allProgramExercises || [])
    : false;

  return (
    <>
      {(isEditMode || warmupSets?.length > 0) && (
        <Fragment>
          {warmupSets.map((set, i) => {
            return (
              <div
                data-cy="warmup-set"
                style={{
                  marginTop: "-0.7rem",
                  marginBottom: "-0.7rem",
                }}
              >
                <div
                  data-cy="warmup-set-title"
                  className="leading-none text-grayv2-main"
                  style={{
                    fontSize: props.size === "small" ? "9px" : "10px",
                    marginBottom: "2px",
                  }}
                >
                  Warmup
                </div>
                <div className={`relative ${isEditMode ? "is-edit-mode" : ""}`}>
                  <ExerciseSetView
                    showHelp={
                      props.showHelp && props.index === 0 && i === 0 && Progress.isFullyEmptySet(props.progress)
                    }
                    settings={props.settings}
                    exercise={props.entry.exercise}
                    size={props.size}
                    isCurrent={!!isCurrentProgress}
                    set={set}
                    isEditMode={isEditMode}
                    onClick={useCallback(
                      (event) => {
                        if (!friend) {
                          event.preventDefault();
                          if (isEditMode && props.onStartSetChanging) {
                            props.onStartSetChanging(true, props.index, i, undefined, props.entry.exercise.equipment);
                          } else {
                            handleClick(
                              props.dispatch,
                              props.index,
                              i,
                              "warmup",
                              props.programExercise,
                              props.allProgramExercises
                            );
                            props.onChangeReps("warmup", props.index, i);
                          }
                        }
                      },
                      [!!friend, isEditMode, props.index, props.entry, props.dispatch]
                    )}
                  />
                  {isEditMode && (
                    <button
                      data-cy="set-edit-mode-remove"
                      style={{ top: "-4px", left: "-13px" }}
                      className="absolute z-10 p-1 ls-edit-set-remove"
                      onClick={() => {
                        EditProgressEntry.removeSet(props.dispatch, props.progress.id, true, props.index, i);
                      }}
                    >
                      <IconCloseCircle />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {isEditMode && props.onStartSetChanging && (
            <div>
              <div
                data-cy="warmup-set-title"
                className="text-xs text-grayv2-main"
                style={{ fontSize: "10px", marginTop: "-0.75em", marginBottom: "-0.75em" }}
              >
                Warmup
              </div>
              <button
                data-cy="add-warmup-set"
                onClick={() =>
                  props.onStartSetChanging!(true, props.index, undefined, undefined, props.entry.exercise.equipment)
                }
                className="w-12 h-12 my-2 mr-3 leading-7 text-center border border-gray-400 border-dashed rounded-lg bg-grayv2-100 ls-edit-set-open-modal-add-warmup is-edit-mode"
              >
                +
              </button>
            </div>
          )}
          <div
            style={{ width: "1px" }}
            className={`${props.size === "small" ? "h-8 mt-1 mr-1" : "h-12 my-2 mr-3"} bg-grayv2-400`}
          ></div>
        </Fragment>
      )}
      {props.entry.sets.map((set, i) => {
        return (
          <div className={`relative ${isEditMode ? "is-edit-mode" : ""}`} data-cy="workout-set">
            <ExerciseSetView
              showHelp={
                props.showHelp &&
                (warmupSets?.length || 0) === 0 &&
                props.index === 0 &&
                i === 0 &&
                Progress.isFullyEmptySet(props.progress)
              }
              size={props.size}
              exercise={props.entry.exercise}
              settings={props.settings}
              set={set}
              isCurrent={!!isCurrentProgress}
              isEditMode={isEditMode}
              onClick={(event) => {
                if (!friend) {
                  event.preventDefault();
                  if (isEditMode && props.onStartSetChanging) {
                    props.onStartSetChanging(false, props.index, i, undefined, props.entry.exercise.equipment);
                  } else {
                    handleClick(
                      props.dispatch,
                      props.index,
                      i,
                      "workout",
                      props.programExercise,
                      props.allProgramExercises
                    );
                    props.onChangeReps("workout", props.index, i);
                  }
                }
              }}
            />
            {isEditMode && (
              <button
                data-cy="set-edit-mode-remove"
                style={{ top: "-4px", left: "-13px" }}
                className="absolute z-10 p-1 ls-edit-set-remove"
                onClick={() => {
                  EditProgressEntry.removeSet(props.dispatch, props.progress.id, false, props.index, i);
                }}
              >
                <IconCloseCircle />
              </button>
            )}
          </div>
        );
      })}
      {(isEditMode || (Progress.isCurrent(props.progress) && !props.programExercise) || quickAddSets) &&
        props.onStartSetChanging && (
          <button
            data-cy="add-set"
            onClick={() =>
              props.onStartSetChanging!(
                false,
                props.index,
                undefined,
                quickAddSets ? props.programExercise : undefined,
                props.entry.exercise.equipment
              )
            }
            className="w-12 h-12 my-2 mr-3 leading-7 text-center border border-dashed rounded-lg bg-grayv2-100 border-grayv2-400 ls-edit-set-open-modal-add"
          >
            +
          </button>
        )}
    </>
  );
}

function handleClick(
  dispatch: IDispatch,
  entryIndex: number,
  setIndex: number,
  mode: IProgressMode,
  programExercise?: IProgramExercise,
  allProgramExercises?: IProgramExercise[]
): void {
  dispatch({ type: "ChangeRepsAction", entryIndex, setIndex, programExercise, allProgramExercises, mode });
}
