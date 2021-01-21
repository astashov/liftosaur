import { h, JSX, Fragment } from "preact";
import { ExerciseSetView } from "./exerciseSet";
import { Exercise, IExerciseType } from "../models/exercise";
import { IDispatch } from "../ducks/types";
import { IProgressMode } from "../models/progress";
import { Weight, IWeight } from "../models/weight";
import { Reps } from "../models/set";
import { IHistoryEntry } from "../models/history";
import { CollectionUtils } from "../utils/collection";
import { ISettings } from "../models/settings";
import { IProgramExercise } from "../models/program";
import { ProgressStateChanges } from "./progressStateChanges";
import { useState } from "preact/hooks";
import { IconQuestion } from "./iconQuestion";
import { IconClose } from "./iconClose";
import { ExerciseImage } from "./exerciseImage";
import { IconEdit } from "./iconEdit";
import { Button } from "./button";
import { IconDelete } from "./iconDelete";
import { EditProgressEntry } from "../models/editProgressEntry";

interface IProps {
  showHelp: boolean;
  entry: IHistoryEntry;
  settings: ISettings;
  day: number;
  programExercise?: IProgramExercise;
  index: number;
  isCurrent?: boolean;
  forceShowStateChanges?: boolean;
  dispatch: IDispatch;
  onStartSetChanging?: (isWarmup: boolean, entryIndex: number, setIndex?: number) => void;
  onChangeReps: (mode: IProgressMode) => void;
}

export function ExerciseView(props: IProps): JSX.Element {
  const { entry } = props;
  const [isImageView, setIsImageView] = useState<boolean>(false);
  let className = "px-4 pt-4 pb-2 mb-2 border rounded-lg";
  if (isImageView) {
    className += " hidden";
  }
  let dataCy;
  if (Reps.isFinished(entry.sets)) {
    if (Reps.isCompleted(entry.sets)) {
      dataCy = "exercise-completed";
      className += " bg-green-100 border-green-300";
    } else {
      dataCy = "exercise-finished";
      className += " bg-red-100 border-red-300";
    }
  } else {
    dataCy = "exercise-progress";
    className += " bg-gray-100 border-gray-300";
  }
  return (
    <Fragment>
      <div className={!isImageView ? "h-0 overflow-hidden p-0 m-0" : ""}>
        <ExerciseImageView {...props} onCloseClick={() => setIsImageView(false)} />
      </div>
      <section data-cy={dataCy} className={className}>
        <ExerciseContentView {...props} onInfoClick={() => setIsImageView(true)} />
        {props.programExercise && (
          <ProgressStateChanges
            entry={props.entry}
            forceShow={props.forceShowStateChanges}
            settings={props.settings}
            day={props.day}
            state={props.programExercise.state}
            script={props.programExercise.finishDayExpr}
          />
        )}
      </section>
    </Fragment>
  );
}

function ExerciseImageView(props: IProps & { onCloseClick: () => void }): JSX.Element {
  const e = props.entry.exercise;
  const exercise = Exercise.get(e);
  return (
    <section className="relative px-4 pt-4 pb-2 mb-2 text-center bg-gray-100 border border-gray-300 rounded-lg">
      <div className="text-left">{exercise.name}</div>
      <ExerciseImage exerciseType={e} />
      <button className="box-content absolute top-0 right-0 w-6 h-6 p-4" onClick={props.onCloseClick}>
        <IconClose />
      </button>
    </section>
  );
}

function ExerciseContentView(props: IProps & { onInfoClick: () => void }): JSX.Element {
  const exercise = Exercise.get(props.entry.exercise);
  const nextSet = [...props.entry.warmupSets, ...props.entry.sets].filter((s) => s.completedReps == null)[0];
  const workoutWeights = CollectionUtils.compatBy(
    props.entry.sets.map((s) => Weight.roundConvertTo(s.weight, props.settings, props.entry.exercise.equipment)),
    (w) => w.value.toString()
  );
  workoutWeights.sort(Weight.compare);
  const warmupSets = props.entry.warmupSets;
  const warmupWeights = CollectionUtils.compatBy(
    props.entry.warmupSets.map((s) => Weight.roundConvertTo(s.weight, props.settings, props.entry.exercise.equipment)),
    (w) => w.value.toString()
  ).filter(
    (w) => Object.keys(Weight.calculatePlates(w, props.settings, props.entry.exercise.equipment).plates).length > 0
  );
  warmupWeights.sort(Weight.compare);
  const targetMuscles = Exercise.targetMuscles(props.entry.exercise);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  return (
    <Fragment>
      <header className="flex">
        <div className="flex-1 mr-auto">
          {exercise.name}
          {targetMuscles.length > 0 && (
            <button style={{ marginBottom: "2px" }} className="px-2 py-0 ml-2 align-middle" onClick={props.onInfoClick}>
              <IconQuestion width={15} height={15} />
            </button>
          )}
          {props.onStartSetChanging &&
            (isEditMode ? (
              <Button data-cy="done-edit-exercise" buttonSize="xs" kind="green" onClick={() => setIsEditMode(false)}>
                Done
              </Button>
            ) : (
              <button
                style={{ marginBottom: "2px" }}
                data-cy="edit-exercise"
                className="px-2 py-0 align-middle"
                onClick={() => setIsEditMode(true)}
              >
                <IconEdit size={15} lineColor="#0D2B3E" penColor="#A5B3BB" />
              </button>
            ))}
        </div>
        <div className="text-right">
          {warmupWeights.map((w) => {
            const className =
              nextSet != null &&
              Weight.eq(Weight.roundConvertTo(nextSet.weight, props.settings, props.entry.exercise.equipment), w)
                ? "font-bold"
                : "";
            return (
              <div className={className}>
                <WeightView weight={w} exercise={props.entry.exercise} settings={props.settings} />
                <span className="text-gray-500">
                  {w.value} {w.unit}
                </span>
              </div>
            );
          })}
          {workoutWeights.map((w, i) => {
            const className =
              nextSet != null &&
              Weight.eq(Weight.roundConvertTo(nextSet.weight, props.settings, props.entry.exercise.equipment), w)
                ? "font-bold"
                : "";
            return (
              <div className={className}>
                <WeightView weight={w} exercise={props.entry.exercise} settings={props.settings} />
                <button
                  data-help-id={props.showHelp && props.index === 0 && i === 0 ? "progress-change-weight" : undefined}
                  data-help="Press here to change weight of the sets. Weights are rounded according to available plates, so make sure you updated them in Settings"
                  data-help-offset-x={-80}
                  data-help-width={140}
                  data-cy="change-weight"
                  className="text-blue-500 underline cursor-pointer"
                  style={{ fontWeight: "inherit" }}
                  onClick={() =>
                    props.dispatch({ type: "ChangeWeightAction", weight: w, exercise: props.entry.exercise })
                  }
                >
                  {w.value} {w.unit}
                </button>
              </div>
            );
          })}
        </div>
      </header>
      <section className="flex flex-wrap pt-2">
        {(isEditMode || warmupSets?.length > 0) && (
          <Fragment>
            {warmupSets.map((set, i) => {
              return (
                <div data-cy="container-set">
                  <div
                    data-cy="warmup-set-title"
                    className="text-xs text-gray-400"
                    style={{ marginTop: "-0.75em", marginBottom: "-0.75em" }}
                  >
                    Warmup
                  </div>
                  <div className={`relative ${isEditMode ? "is-edit-mode" : ""}`}>
                    <ExerciseSetView
                      showHelp={props.showHelp && props.index === 0 && i === 0}
                      settings={props.settings}
                      exercise={props.entry.exercise}
                      isCurrent={!!props.isCurrent}
                      set={set}
                      isEditMode={false}
                      onClick={(event) => {
                        event.preventDefault();
                        if (isEditMode && props.onStartSetChanging) {
                          props.onStartSetChanging(true, props.index, i);
                        } else {
                          props.onChangeReps("warmup");
                          handleClick(props.dispatch, props.entry.exercise, set.weight, i, "warmup");
                        }
                      }}
                    />
                    {isEditMode && (
                      <button
                        data-cy="set-edit-mode-remove"
                        style={{ top: "-0.5rem", left: "-0.5rem" }}
                        className="absolute p-1"
                        onClick={() => {
                          EditProgressEntry.removeSet(props.dispatch, true, props.index, i);
                        }}
                      >
                        <IconDelete />
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
                  className="text-xs text-gray-400"
                  style={{ marginTop: "-0.75em", marginBottom: "-0.75em" }}
                >
                  Warmup
                </div>
                <button
                  data-cy="add-warmup-set"
                  onClick={() => props.onStartSetChanging!(true, props.index, undefined)}
                  className="w-12 h-12 my-2 mr-3 leading-7 text-center bg-gray-200 border border-gray-400 border-dashed rounded-lg is-edit-mode"
                >
                  +
                </button>
              </div>
            )}
            <div style={{ width: "1px" }} className="h-12 my-2 mr-3 bg-gray-400"></div>
          </Fragment>
        )}
        {props.entry.sets.map((set, i) => {
          return (
            <div className={`relative ${isEditMode ? "is-edit-mode" : ""}`}>
              <ExerciseSetView
                showHelp={props.showHelp && (warmupSets?.length || 0) === 0 && props.index === 0 && i === 0}
                exercise={props.entry.exercise}
                settings={props.settings}
                set={set}
                isCurrent={!!props.isCurrent}
                isEditMode={isEditMode}
                onClick={(event) => {
                  event.preventDefault();
                  if (isEditMode && props.onStartSetChanging) {
                    props.onStartSetChanging(false, props.index, i);
                  } else {
                    props.onChangeReps("workout");
                    handleClick(props.dispatch, props.entry.exercise, set.weight, i, "workout");
                  }
                }}
              />
              {isEditMode && (
                <button
                  data-cy="set-edit-mode-remove"
                  style={{ top: "-0.5rem", left: "-0.5rem" }}
                  className="absolute p-1"
                  onClick={() => {
                    EditProgressEntry.removeSet(props.dispatch, false, props.index, i);
                  }}
                >
                  <IconDelete />
                </button>
              )}
            </div>
          );
        })}
        {isEditMode && props.onStartSetChanging && (
          <button
            data-cy="add-set"
            onClick={() => props.onStartSetChanging!(false, props.index, undefined)}
            className="w-12 h-12 my-2 mr-3 leading-7 text-center bg-gray-200 border border-gray-400 border-dashed rounded-lg is-edit-mode"
          >
            +
          </button>
        )}
      </section>
    </Fragment>
  );
}

function handleClick(
  dispatch: IDispatch,
  exercise: IExerciseType,
  weight: IWeight,
  setIndex: number,
  mode: IProgressMode
): void {
  dispatch({ type: "ChangeRepsAction", exercise, setIndex, weight, mode });
}

function WeightView(props: { weight: IWeight; exercise: IExerciseType; settings: ISettings }): JSX.Element {
  const { plates, totalWeight: weight } = Weight.calculatePlates(
    props.weight,
    props.settings,
    props.exercise.equipment
  );
  const className = Weight.eq(weight, props.weight) ? "text-gray-600" : "text-red-600";
  return (
    <span className="mx-2 text-xs break-all">
      <span className={className}>{Weight.formatOneSide(plates, props.exercise.equipment)}</span>
    </span>
  );
}
