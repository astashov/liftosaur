import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { ISettings, ISet, IExerciseType, ISubscription, IProgramState, IHistoryRecord } from "../types";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { updateProgress } from "../models/state";
import { LensBuilder } from "lens-shmens";
import { WorkoutExerciseSet } from "./workoutExerciseSet";
import { Reps } from "../models/set";
import { IconPlus2 } from "./icons/iconPlus2";
import { Tailwind } from "../utils/tailwindConfig";
import { IByExercise } from "../pages/planner/plannerEvaluator";
import { WorkoutExerciseUtils } from "../utils/workoutExerciseUtils";

interface IWorkoutExerciseAllSets {
  day: number;
  isCurrentProgress: boolean;
  exerciseType: IExerciseType;
  lbWarmupSets: LensBuilder<IHistoryRecord, ISet[], {}>;
  lbSets: LensBuilder<IHistoryRecord, ISet[], {}>;
  warmupSets: ISet[];
  entryIndex: number;
  sets: ISet[];
  subscription?: ISubscription;
  programExercise?: IPlannerProgramExercise;
  otherStates?: IByExercise<IProgramState>;
  settings: ISettings;
  dispatch: IDispatch;
}

export function WorkoutExerciseAllSets(props: IWorkoutExerciseAllSets): JSX.Element {
  const buttonBgColor = WorkoutExerciseUtils.getBgColor100(props.sets);
  const nextSetIndex = [...props.warmupSets, ...props.sets].findIndex((s) => !Reps.isFinishedSet(s));

  return (
    <div>
      <div className="table w-full overflow-hidden">
        <div className="table-row-group">
          <div className="table-row text-xs border-b text-grayv2-main border-grayv3-100">
            <div className="table-cell px-2 pb-1 font-normal text-center border-b border-grayv3-100">Set</div>
            <div className="table-cell pb-1 font-normal text-left border-b border-grayv3-100">Target</div>
            <div className="table-cell pb-1 font-normal text-center border-b border-grayv3-100">Reps</div>
            <div className="table-cell pb-1 border-b border-grayv3-100"></div>
            <div className="table-cell pb-1 font-normal text-center border-b border-grayv3-100">lb</div>
            <div className="table-cell pb-1 pr-4 border-b border-grayv3-100"></div>
          </div>
        </div>
        <div className="table-row-group">
          {props.warmupSets.map((set, i) => {
            return (
              <WorkoutExerciseSet
                isCurrentProgress={props.isCurrentProgress}
                type="warmup"
                key={`warmup-${set.id}-${i}`}
                day={props.day}
                exerciseType={props.exerciseType}
                programExercise={props.programExercise}
                otherStates={props.otherStates}
                subscription={props.subscription}
                lbSets={props.lbWarmupSets}
                lbSet={props.lbWarmupSets.i(i)}
                set={set}
                entryIndex={props.entryIndex}
                isNext={nextSetIndex === i}
                setIndex={i}
                settings={props.settings}
                dispatch={props.dispatch}
              />
            );
          })}
          {props.sets.map((set, i) => {
            return (
              <WorkoutExerciseSet
                isCurrentProgress={props.isCurrentProgress}
                type="workout"
                key={`workout-${set.id}-${i}`}
                isNext={nextSetIndex - props.warmupSets.length === i}
                programExercise={props.programExercise}
                day={props.day}
                otherStates={props.otherStates}
                exerciseType={props.exerciseType}
                subscription={props.subscription}
                lbSets={props.lbSets}
                lbSet={props.lbSets.i(i)}
                set={set}
                entryIndex={props.entryIndex}
                setIndex={i}
                settings={props.settings}
                dispatch={props.dispatch}
              />
            );
          })}
        </div>
      </div>
      <div className="flex gap-4 px-4 my-2">
        <div className="flex-1">
          <button
            className={`${buttonBgColor} w-full py-2 text-xs font-semibold text-center rounded-md text-bluev3-main`}
            onClick={() => {
              updateProgress(props.dispatch, [props.lbWarmupSets.recordModify((sets) => Reps.addSet(sets))]);
            }}
          >
            <span>
              <IconPlus2 size={10} className="inline-block" color={Tailwind.colors().bluev3.main} />
            </span>
            <span className="ml-2">Add Warmup Set</span>
          </button>
        </div>
        <div className="flex-1">
          <button
            className={`${buttonBgColor} w-full py-2 text-xs font-semibold text-center rounded-md text-bluev3-main`}
            onClick={() => {
              updateProgress(props.dispatch, [props.lbSets.recordModify((sets) => Reps.addSet(sets))]);
            }}
          >
            <span>
              <IconPlus2 size={10} className="inline-block" color={Tailwind.colors().bluev3.main} />
            </span>
            <span className="ml-2">Add Set</span>
          </button>
        </div>
      </div>
    </div>
  );
}
