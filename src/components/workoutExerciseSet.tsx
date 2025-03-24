import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { ISettings, ISet, IExerciseType, ISubscription, IProgramState, IHistoryRecord } from "../types";
import { IconCheckCircle } from "./icons/iconCheckCircle";
import { n } from "../utils/math";
import { InputNumber2 } from "./inputNumber2";
import { InputWeight2 } from "./inputWeight2";
import { Tailwind } from "../utils/tailwindConfig";
import { updateProgress } from "../models/state";
import { LensBuilder } from "lens-shmens";
import { WorkoutExerciseUtils } from "../utils/workoutExerciseUtils";
import { Swipeable } from "./swipeable";
import { CollectionUtils } from "../utils/collection";
import { Mobile } from "../../lambda/utils/mobile";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { IByExercise } from "../pages/planner/plannerEvaluator";
import { EditProgressEntry } from "../models/editProgressEntry";
import { Reps } from "../models/set";
import { Weight } from "../models/weight";
import { Exercise } from "../models/exercise";

interface IWorkoutExerciseSet {
  exerciseType: IExerciseType;
  day: number;
  type: "warmup" | "workout";
  lbSet: LensBuilder<IHistoryRecord, ISet, {}>;
  lbSets: LensBuilder<IHistoryRecord, ISet[], {}>;
  isCurrentProgress: boolean;
  set: ISet;
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
  const isMobile = Mobile.isMobile(navigator.userAgent);
  const borderClass = ` border-b ${WorkoutExerciseUtils.getBorderColor100([set])} `;
  const hasEdit = props.type === "workout" && props.programExercise != null;

  return (
    <Swipeable
      width={hasEdit ? 128 : 64}
      openThreshold={hasEdit ? 30 : 15}
      closeThreshold={hasEdit ? 110 : 55}
      scrollThreshold={7}
      initiateTreshold={15}
    >
      {({ onPointerDown, onPointerMove, onPointerUp, style, close }) => (
        <div
          className={`will-change-transform relative table-row ${WorkoutExerciseUtils.getBgColor50([set])}`}
          data-cy={getDataCy(set)}
          style={style}
          onTouchStart={isMobile ? onPointerDown : undefined}
          onTouchMove={isMobile ? onPointerMove : undefined}
          onTouchEnd={isMobile ? onPointerUp : undefined}
          onPointerDown={!isMobile ? onPointerDown : undefined}
          onPointerMove={!isMobile ? onPointerMove : undefined}
          onPointerUp={!isMobile ? onPointerUp : undefined}
        >
          <div className={`${borderClass} table-cell py-1 px-2 align-middle`}>
            <div
              className={`w-6 h-6 flex items-center justify-center rounded-full${
                props.isNext ? " bg-purplev3-main text-white font-bold" : ""
              }`}
            >
              <div>{props.setIndex + 1}</div>
            </div>
          </div>
          <div className={`${borderClass} table-cell w-full align-middle`}>
            {props.type === "warmup" ? (
              <span className="text-xs text-grayv3-main">Warmup</span>
            ) : props.isCurrentProgress && props.programExercise == null ? (
              <span className="text-xs text-grayv3-main">Ad-hoc</span>
            ) : (
              <WorkoutExerciseSetTarget set={set} />
            )}
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
                name="input-set-reps"
                onBlur={(value) => {
                  updateProgress(props.dispatch, [
                    props.lbSet.recordModify((set) => {
                      const newSet = { ...set, completedReps: value };
                      return Reps.enforceCompletedSet(newSet);
                    }),
                  ]);
                }}
                placeholder={placeholderReps}
                initialValue={set.reps}
                value={set.completedReps || undefined}
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
                name="input-set-weight"
                exerciseType={props.exerciseType}
                data-cy="weight-value"
                onBlur={(value) => {
                  if (value == null || value.unit !== "%") {
                    updateProgress(props.dispatch, [
                      props.lbSet.recordModify((set) => {
                        const newSet = { ...set, completedWeight: value };
                        return Reps.enforceCompletedSet(newSet);
                      }),
                    ]);
                  }
                }}
                addOn={
                  set.rpe != null && set.reps != null
                    ? () => (
                        <RpeWeightHint
                          reps={set.completedReps ?? set.reps}
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
                <div className="ml-1 text-xs font-semibold text-greenv3-700">@{n(completedRpeValue)}</div>
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
                  color={set.isCompleted ? Tailwind.colors().purplev3.main : Tailwind.colors().grayv3[400]}
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
                  onClick={() => {
                    close();
                    EditProgressEntry.showEditSetModal(
                      props.dispatch,
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
                data-cy="delete-edit-exercise"
                tabIndex={-1}
                onClick={() => {
                  close();
                  updateProgress(props.dispatch, [
                    props.lbSets.recordModify((s) => {
                      const newSets = CollectionUtils.removeAt(s, props.setIndex);
                      return newSets;
                    }),
                  ]);
                }}
                className="flex-1 h-full text-white bg-redv3-600 nm-workout-exercise-set-delete"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Swipeable>
  );
}

function WorkoutExerciseSetTarget(props: { set: ISet }): JSX.Element {
  const set = props.set;
  const isDiffWeight = set.weight && set.originalWeight && !Weight.eq(set.weight, set.originalWeight);
  return (
    <div className="inline-block align-middle">
      {set.label ? <div className="text-xs text-grayv3-main">{set.label}</div> : null}
      <div>
        <span className="font-semibold" style={{ color: "#940" }}>
          {set.minReps != null ? `${n(Math.max(0, set.minReps))}-` : null}
          {n(Math.max(0, set.reps))}
          {set.isAmrap ? "+" : ""}
        </span>
        <span className="text-grayv3-main"> × </span>
        <span>
          {set.originalWeight && (
            <span
              className={isDiffWeight ? "line-through text-grayv3-main" : "font-semibold"}
              style={{ color: isDiffWeight ? "" : "#164" }}
            >
              <span>{set.originalWeight.value}</span>
              <span className="text-xs font-normal">{set.originalWeight.unit}</span>
            </span>
          )}
          {set.originalWeight && isDiffWeight && (
            <span style={{ color: "#164" }}>
              <span> </span>
              <span className="font-semibold">{set.weight.value}</span>
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
              <span className="font-bold">{n(set.timer)}</span>
              <span className="text-xs">s</span>
            </span>
          </span>
        ) : null}
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
    } else if (set.minReps != null && set.completedReps < set.reps) {
      return "set-amrap-in-range";
    } else if (set.completedReps < set.reps) {
      return "set-amrap-incompleted";
    } else {
      return "set-amrap-completed";
    }
  } else if (set.completedReps == null || !set.isCompleted) {
    return "set-nonstarted";
  } else {
    if (set.completedReps >= set.reps) {
      return "set-completed";
    } else if (set.minReps != null && set.completedReps >= set.minReps) {
      return "set-in-range";
    } else {
      return "set-incompleted";
    }
  }
}
