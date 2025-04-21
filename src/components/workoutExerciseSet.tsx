import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { ISettings, ISet, IExerciseType, ISubscription, IProgramState, IHistoryRecord } from "../types";
import { IconCheckCircle } from "./icons/iconCheckCircle";
import { n } from "../utils/math";
import { InputNumber2 } from "./inputNumber2";
import { InputWeight2 } from "./inputWeight2";
import { updateProgress } from "../models/state";
import { LensBuilder } from "lens-shmens";
import { WorkoutExerciseUtils } from "../utils/workoutExerciseUtils";
import { SwipeableRow } from "./swipeableRow";
import { CollectionUtils } from "../utils/collection";
import { Mobile } from "../../lambda/utils/mobile";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { IByExercise } from "../pages/planner/plannerEvaluator";
import { EditProgressEntry } from "../models/editProgressEntry";
import { Reps } from "../models/set";
import { Weight } from "../models/weight";
import { Exercise } from "../models/exercise";
import { set } from "fp-ts";

interface IWorkoutExerciseSet {
  exerciseType: IExerciseType;
  day: number;
  type: "warmup" | "workout";
  lbSet: LensBuilder<IHistoryRecord, ISet, {}>;
  lbSets: LensBuilder<IHistoryRecord, ISet[], {}>;
  isCurrentProgress: boolean;
  lastSet?: ISet;
  set: ISet;
  helps?: string[];
  onStopShowingHint?: () => void;
  isNext?: boolean;
  subscription?: ISubscription;
  entryIndex: number;
  programExercise?: IPlannerProgramExercise;
  otherStates?: IByExercise<IProgramState>;
  setIndex: number;
  settings: ISettings;
  dispatch: IDispatch;
}

export function WorkoutExerciseSet(props: IWorkoutExerciseSet): JSX.Element {
  const set = props.set;
  const placeholderReps = `${set.minReps != null ? `${set.minReps}-` : ""}${set.reps != null ? set.reps : ""}${set.reps != null && set.isAmrap ? "+" : ""}`;
  const placeholderWeight = set.weight?.value != null ? `${set.weight.value}${set.askWeight ? "+" : ""}` : undefined;
  const completedRpeValue = set.logRpe && set.completedRpe != null ? set.completedRpe : undefined;
  const isMobile = Mobile.isMobileFromWindow();
  const isPlaywright = Mobile.isPlaywrightFromWindow();
  const shouldUseTouch = isMobile && !isPlaywright;
  const borderClass = ` border-b border-purplev3-150`;
  const hasEdit = props.type === "workout";

  return (
    <SwipeableRow
      showHint={props.setIndex === 0 && props.helps && !props.helps.includes("swipeable-set")}
      width={hasEdit ? 128 : 64}
      openThreshold={hasEdit ? 30 : 15}
      closeThreshold={hasEdit ? 110 : 55}
      scrollThreshold={7}
      initiateTreshold={15}
      onPointerDown={props.onStopShowingHint}
    >
      {({ onPointerDown, onPointerMove, onPointerUp, style, close }) => (
        <div
          className={`will-change-transform relative table-row ${WorkoutExerciseUtils.getBgColor50([set], props.type === "warmup")}`}
          data-cy={getDataCy(set)}
          style={style}
          onTouchStart={shouldUseTouch ? onPointerDown : undefined}
          onTouchMove={shouldUseTouch ? onPointerMove : undefined}
          onTouchEnd={shouldUseTouch ? onPointerUp : undefined}
          onPointerDown={!shouldUseTouch ? onPointerDown : undefined}
          onPointerMove={!shouldUseTouch ? onPointerMove : undefined}
          onPointerUp={!shouldUseTouch ? onPointerUp : undefined}
        >
          <div className="table-cell px-2 py-1 text-sm align-middle border-b border-purplev3-150">
            <div
              className={`w-6 h-6 flex items-center justify-center rounded-full${
                props.isNext ? " bg-purplev3-main text-white font-bold" : ""
              }`}
            >
              <div>{props.type === "warmup" ? <span className="text-xs">W</span> : props.setIndex + 1}</div>
            </div>
          </div>
          <div data-cy="workout-set-target" className={`${borderClass} table-cell w-full align-middle`}>
            <WorkoutExerciseSetTargetField
              set={set}
              lastSet={props.lastSet}
              setType={
                props.type === "warmup"
                  ? "warmup"
                  : props.isCurrentProgress && props.programExercise == null
                    ? "adhoc"
                    : "program"
              }
              settings={props.settings}
              exerciseType={props.exerciseType}
            />
          </div>
          <div className={`${borderClass} table-cell py-2 align-middle`}>
            <div className="flex justify-center text-center">
              <InputNumber2
                tabIndex={
                  props.day * 10000 +
                  props.entryIndex * 100 +
                  props.setIndex * 4 +
                  1 +
                  (props.type === "warmup" ? 0 : 100)
                }
                width={3.5}
                data-cy="reps-value"
                name="set-reps"
                onInput={(value) => {
                  if (value != null && !isNaN(value) && value >= 0) {
                    updateProgress(
                      props.dispatch,
                      [
                        props.lbSet.recordModify((set) => {
                          const newSet = { ...set, completedReps: Math.round(value) };
                          return Reps.enforceCompletedSet(newSet);
                        }),
                      ],
                      "input-reps"
                    );
                  }
                }}
                onBlur={(value) => {
                  updateProgress(
                    props.dispatch,
                    [
                      props.lbSet.recordModify((set) => {
                        const newSet = { ...set, completedReps: value };
                        return Reps.enforceCompletedSet(newSet);
                      }),
                    ],
                    "blur-reps"
                  );
                }}
                placeholder={placeholderReps}
                initialValue={set.reps}
                value={set.completedReps != null ? set.completedReps : undefined}
                min={0}
                max={9999}
                step={1}
              />
            </div>
          </div>
          <div className={`${borderClass} table-cell py-2 text-center px-1 align-middle`}>×</div>
          <div className={`${borderClass} table-cell py-2 align-middle`}>
            <div className="flex items-center justify-start text-center">
              <InputWeight2
                tabIndex={
                  props.day * 10000 +
                  props.entryIndex * 100 +
                  props.setIndex * 4 +
                  2 +
                  (props.type === "warmup" ? 0 : 100)
                }
                name="set-weight"
                exerciseType={props.exerciseType}
                data-cy="weight-value"
                onBlur={(value) => {
                  if (value == null || value.unit !== "%") {
                    updateProgress(
                      props.dispatch,
                      [
                        props.lbSet.recordModify((set) => {
                          const newSet = { ...set, completedWeight: value };
                          return Reps.enforceCompletedSet(newSet);
                        }),
                      ],
                      "blur-weight"
                    );
                  }
                }}
                onInput={(value) => {
                  if (value != null && value.unit !== "%") {
                    updateProgress(
                      props.dispatch,
                      [
                        props.lbSet.recordModify((set) => {
                          const newSet = { ...set, completedWeight: value };
                          return Reps.enforceCompletedSet(newSet);
                        }),
                      ],
                      "input-weight"
                    );
                  }
                }}
                addOn={
                  set.rpe != null && set.reps != null
                    ? () => (
                        <RpeWeightHint
                          reps={set.completedReps ?? set.reps ?? 0}
                          rpe={set.completedRpe ?? set.rpe!}
                          settings={props.settings}
                          exerciseType={props.exerciseType}
                        />
                      )
                    : undefined
                }
                subscription={props.subscription}
                placeholder={placeholderWeight}
                initialValue={set.weight}
                value={set.completedWeight || undefined}
                max={9999}
                min={-9999}
                settings={props.settings}
              />
              {completedRpeValue != null ? (
                <div data-cy="rpe-value" className="ml-1 text-xs font-semibold text-greenv3-700">
                  @{n(completedRpeValue)}
                </div>
              ) : null}
            </div>
          </div>
          <div className={`${borderClass} relative table-cell pr-4 pl-1 text-right align-middle`}>
            <div className="flex items-center justify-end">
              <button
                tabIndex={
                  props.day * 10000 +
                  props.entryIndex * 100 +
                  props.setIndex * 4 +
                  3 +
                  (props.type === "warmup" ? 0 : 100)
                }
                className="px-4 py-3 nm-workout-exercise-set-complete"
                data-cy="complete-set"
                style={{ marginRight: "-0.5rem" }}
                onClick={() => {
                  props.dispatch({
                    type: "CompleteSetAction",
                    setIndex: props.setIndex,
                    entryIndex: props.entryIndex,
                    programExercise: props.programExercise,
                    otherStates: props.otherStates,
                    mode: props.type,
                  });
                }}
              >
                <IconCheckCircle
                  size={24}
                  isChecked={true}
                  color={WorkoutExerciseUtils.getIconColor([set], props.type === "warmup")}
                />
              </button>
            </div>
            <div
              className={`absolute top-0 bottom-0 flex ${hasEdit ? "w-32" : "w-16"} will-change-transform left-full`}
              style={{ marginLeft: "1px" }}
            >
              {hasEdit && (
                <button
                  tabIndex={-1}
                  data-cy="edit-set-target"
                  onClick={() => {
                    close();
                    EditProgressEntry.showEditSetModal(
                      props.dispatch,
                      props.settings.units,
                      props.type === "warmup",
                      props.entryIndex,
                      props.setIndex,
                      props.programExercise,
                      props.exerciseType,
                      set
                    );
                  }}
                  className="flex-1 h-full text-white bg-grayv3-main nm-workout-exercise-set-edit"
                >
                  Edit
                </button>
              )}
              <button
                data-cy="delete-set"
                tabIndex={-1}
                onClick={() => {
                  close();
                  updateProgress(
                    props.dispatch,
                    [
                      props.lbSets.recordModify((s) => {
                        const newSets = CollectionUtils.removeAt(s, props.setIndex);
                        return newSets;
                      }),
                    ],
                    "delete-set"
                  );
                }}
                className="flex-1 h-full text-white bg-redv3-600 nm-workout-exercise-set-delete"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </SwipeableRow>
  );
}

interface IWorkoutExerciseSetTargetProps {
  setType: "program" | "warmup" | "adhoc";
  set: ISet;
}

function WorkoutExerciseSetTarget(props: IWorkoutExerciseSetTargetProps): JSX.Element {
  switch (props.setType) {
    case "warmup":
      const set = props.set;
      return (
        <span className="inline-block text-xs break-all text-grayv3-main">
          <div className="inline-block text-sm align-middle">
            <div className="text-xs text-grayv3-main">Warmup</div>
            <div>
              {set.reps != null && <span className="font-semibold">{n(Math.max(0, set.reps))}</span>}
              {set.reps != null && set.weight != null && <span className="text-grayv3-main"> × </span>}
              {set.weight != null && (
                <span>
                  <span> </span>
                  <span className="font-semibold">{n(set.weight.value)}</span>
                  <span className="text-xs">{set.weight.unit}</span>
                </span>
              )}
            </div>
          </div>
        </span>
      );
    case "adhoc":
    case "program": {
      const set = props.set;
      const isDiffWeight = set.weight && set.originalWeight && !Weight.eq(set.weight, set.originalWeight);
      const hasTarget = set.reps != null || set.weight != null;
      return (
        <div className="inline-block text-sm align-middle">
          {set.label ? <div className="text-xs text-grayv3-main">{set.label}</div> : null}
          {props.setType === "adhoc" && <div className="text-xs text-grayv3-main">Ad-hoc</div>}
          {hasTarget ? (
            <div>
              {set.reps != null && (
                <span className="font-semibold" style={{ color: "#940" }}>
                  {set.minReps != null ? `${n(Math.max(0, set.minReps))}-` : null}
                  {n(Math.max(0, set.reps))}
                  {set.isAmrap ? "+" : ""}
                </span>
              )}
              {set.reps != null && set.weight != null && <span className="text-grayv3-main"> × </span>}
              <span>
                {set.originalWeight && (
                  <span
                    className={isDiffWeight ? "line-through text-grayv3-main" : "font-semibold"}
                    style={{ color: isDiffWeight ? "" : "#164" }}
                  >
                    <span>{n(set.originalWeight.value)}</span>
                    <span className="text-xs font-normal">{set.originalWeight.unit}</span>
                  </span>
                )}
                {set.weight && isDiffWeight && (
                  <span style={{ color: "#164" }}>
                    <span> </span>
                    <span className="font-semibold">{n(set.weight.value)}</span>
                    <span className="text-xs">{set.weight.unit}</span>
                  </span>
                )}
              </span>
              <span className="font-semibold" style={{ color: "#164" }}>
                {set.askWeight ? "+" : ""}
                {set.rpe ? ` @${n(Math.max(0, set.rpe))}` : null}
                {set.rpe && set.logRpe ? "+" : ""}
              </span>
              {set.timer != null ? (
                <span>
                  <span> </span>
                  <span style={{ color: "#708" }}>
                    <span>{n(set.timer)}</span>
                    <span className="text-xs">s</span>
                  </span>
                </span>
              ) : null}
            </div>
          ) : (
            <div>None</div>
          )}
        </div>
      );
    }
  }
}

interface IWorkoutExerciseLastSetProps {
  set?: ISet;
}

function WorkoutExerciseLastSet(props: IWorkoutExerciseLastSetProps): JSX.Element {
  const set = props.set;
  if (set == null) {
    return <span className="text-xs text-grayv3-main">No last set</span>;
  }
  const setStatus = Reps.setsStatus([set]);
  return (
    <div className="inline-block text-sm align-middle">
      {set.label ? <div className="text-xs text-grayv3-main">{set.label}</div> : null}
      <div>
        <span className={`font-semibold ${WorkoutExerciseUtils.setsStatusToTextColor(setStatus)}`}>
          {set.completedReps != null ? n(set.completedReps) : "-"}
        </span>
        <span className="text-grayv3-main"> × </span>
        <span>
          <span className={`font-semibold ${WorkoutExerciseUtils.setsStatusToTextColor(setStatus)}`}>
            {set.completedWeight ? <span>{set.completedWeight.value}</span> : "-"}
            <span className="text-xs font-normal">{set.completedWeight?.unit}</span>
          </span>
        </span>
        <span className={`font-semibold ${WorkoutExerciseUtils.setsStatusToTextColor(setStatus)}`}>
          {set.completedRpe != null
            ? ` @${n(Math.max(0, set.completedRpe))}+`
            : set.rpe != null
              ? ` @${n(Math.max(0, set.rpe))}`
              : ""}
        </span>
      </div>
    </div>
  );
}

interface IRpeWeightHintProps {
  reps: number;
  rpe: number;
  settings: ISettings;
  exerciseType: IExerciseType;
}

function RpeWeightHint(props: IRpeWeightHintProps): JSX.Element {
  const multiplier = Weight.rpeMultiplier(props.reps, props.rpe);
  const onerm = Exercise.onerm(props.exerciseType, props.settings);
  const weight = Weight.multiply(onerm, multiplier);
  return (
    <div className="text-xs text-grayv3-main">
      <span className="font-bold" style={{ color: "#940" }}>
        {props.reps}
      </span>{" "}
      ×{" "}
      <span className="font-bold" style={{ color: "#164" }}>
        @{props.rpe}
      </span>{" "}
      - <span className="font-bold text-blackv2">{n(multiplier * 100, 0)}%</span> of 1RM -{" "}
      <span className="font-bold text-blackv2">{weight.value}</span>
      <span>{weight.unit}</span>
    </div>
  );
}

function getDataCy(set: ISet): string {
  if (set.isAmrap) {
    if (!set.isCompleted || !set.completedReps) {
      return "set-amrap-nonstarted";
    } else if (set.minReps != null && set.completedReps < set.minReps) {
      return "set-amrap-incompleted";
    } else if (set.minReps != null && set.reps != null && set.completedReps < set.reps) {
      return "set-amrap-in-range";
    } else if (set.reps != null && set.completedReps < set.reps) {
      return "set-amrap-incompleted";
    } else {
      return "set-amrap-completed";
    }
  } else if (set.completedReps == null || !set.isCompleted) {
    return "set-nonstarted";
  } else {
    if (set.reps == null || set.completedReps >= set.reps) {
      return "set-completed";
    } else if (set.minReps != null && set.completedReps >= set.minReps) {
      return "set-in-range";
    } else {
      return "set-incompleted";
    }
  }
}

interface IWorkoutExerciseSetTargetFieldProps {
  setType: "program" | "warmup" | "adhoc";
  set: ISet;
  lastSet?: ISet;
  settings: ISettings;
  exerciseType: IExerciseType;
}

function WorkoutExerciseSetTargetField(props: IWorkoutExerciseSetTargetFieldProps): JSX.Element {
  switch (props.settings.workoutSettings.targetType) {
    case "target": {
      return <WorkoutExerciseSetTarget set={props.set} setType={props.setType} />;
    }
    case "lasttime": {
      return <WorkoutExerciseLastSet set={props.lastSet} />;
    }
    case "platescalculator": {
      return (
        <WorkoutExercisePlatesCalculator set={props.set} settings={props.settings} exerciseType={props.exerciseType} />
      );
    }
  }
  return <div />;
}

interface IWorkoutExercisePlatesCalculatorProps {
  set: ISet;
  settings: ISettings;
  exerciseType: IExerciseType;
}

function WorkoutExercisePlatesCalculator(props: IWorkoutExercisePlatesCalculatorProps): JSX.Element {
  const setWeight = props.set.weight;
  if (setWeight == null) {
    return (
      <span className="text-sm font-semibold break-all">
        <span data-cy="plates-list">None</span>
      </span>
    );
  }

  const { plates, totalWeight: weight } = Weight.calculatePlates(
    props.set.completedWeight ?? setWeight,
    props.settings,
    setWeight.unit,
    props.exerciseType
  );
  const formattedPlates = plates.length > 0 ? Weight.formatOneSide(props.settings, plates, props.exerciseType) : "None";
  return (
    <span className="text-sm font-semibold break-all">
      <span
        className={Weight.eq(weight, props.set.completedWeight ?? setWeight) ? "text-blackv2" : "text-redv2-600"}
        data-cy="plates-list"
      >
        {formattedPlates}
      </span>
    </span>
  );
}
