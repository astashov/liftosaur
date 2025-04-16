import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import {
  ISettings,
  ISet,
  IExerciseType,
  ISubscription,
  IProgramState,
  IHistoryRecord,
  ITargetType,
  IHistoryEntry,
} from "../types";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { updateProgress } from "../models/state";
import { LensBuilder } from "lens-shmens";
import { WorkoutExerciseSet } from "./workoutExerciseSet";
import { Reps } from "../models/set";
import { IconPlus2 } from "./icons/iconPlus2";
import { Tailwind } from "../utils/tailwindConfig";
import { IByExercise } from "../pages/planner/plannerEvaluator";
import { WorkoutExerciseUtils } from "../utils/workoutExerciseUtils";
import { Equipment } from "../models/equipment";
import { IconSwapSmall } from "./icons/iconSwapSmall";
import { ProgressStateChanges } from "./progressStateChanges";
import { IEvaluatedProgram } from "../models/program";

interface IWorkoutExerciseAllSets {
  day: number;
  isCurrentProgress: boolean;
  exerciseType: IExerciseType;
  lbWarmupSets: LensBuilder<IHistoryRecord, ISet[], {}>;
  lbSets: LensBuilder<IHistoryRecord, ISet[], {}>;
  entry: IHistoryEntry;
  entryIndex: number;
  lastSets?: ISet[];
  helps?: string[];
  onStopShowingHint?: () => void;
  onTargetClick?: () => void;
  subscription?: ISubscription;
  userPromptedStateVars?: IProgramState;
  program?: IEvaluatedProgram;
  programExercise?: IPlannerProgramExercise;
  otherStates?: IByExercise<IProgramState>;
  settings: ISettings;
  dispatch: IDispatch;
}

function getTargetColumnLabel(targetType: ITargetType): string {
  switch (targetType) {
    case "target":
      return "Target";
    case "lasttime":
      return "Previous Set";
    case "platescalculator":
      return "Plates";
  }
}

export function WorkoutExerciseAllSets(props: IWorkoutExerciseAllSets): JSX.Element {
  const warmupSets = props.entry.warmupSets;
  const sets = props.entry.sets;
  const buttonBgColor = WorkoutExerciseUtils.getBgColor100(sets, false);
  const nextSetIndex = [...warmupSets, ...sets].findIndex((s) => !Reps.isFinishedSet(s));
  const exerciseUnit = Equipment.getUnitOrDefaultForExerciseType(props.settings, props.exerciseType);
  const targetLabel = getTargetColumnLabel(props.settings.workoutSettings.targetType);

  return (
    <div>
      <div className="table w-full overflow-hidden">
        <div className="table-row-group">
          <div className="table-row text-xs border-b text-grayv2-main border-grayv3-100">
            <div className="table-cell px-2 pb-1 font-normal text-center border-b border-grayv3-100">Set</div>
            <div className="table-cell pb-1 font-normal text-left border-b border-grayv3-100">
              <button onClick={props.onTargetClick} className="inline-block w-full text-left">
                {targetLabel ? <span className="mr-1">{targetLabel}</span> : <></>}
                {props.onTargetClick && (
                  <IconSwapSmall className="inline-block" size={12} color={Tailwind.colors().grayv3.main} />
                )}
              </button>
            </div>
            <div className="table-cell pb-1 font-normal text-center border-b border-grayv3-100">Reps</div>
            <div className="table-cell pb-1 border-b border-grayv3-100"></div>
            <div className="table-cell pb-1 font-normal text-center border-b border-grayv3-100">{exerciseUnit}</div>
            <div className="table-cell pb-1 pr-4 border-b border-grayv3-100"></div>
          </div>
        </div>
        <div className="table-row-group">
          {warmupSets.map((set, i) => {
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
          {sets.map((set, i) => {
            return (
              <WorkoutExerciseSet
                isCurrentProgress={props.isCurrentProgress}
                type="workout"
                key={`workout-${set.id}-${i}`}
                onStopShowingHint={props.onStopShowingHint}
                helps={props.helps}
                isNext={nextSetIndex - warmupSets.length === i}
                programExercise={props.programExercise}
                day={props.day}
                otherStates={props.otherStates}
                exerciseType={props.exerciseType}
                lastSet={props.lastSets?.[i]}
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
      {props.programExercise && props.program && (
        <div className="mx-4 mt-2 mb-1">
          <ProgressStateChanges
            entry={props.entry}
            settings={props.settings}
            dayData={props.programExercise.dayData}
            programExercise={props.programExercise}
            program={props.program}
            userPromptedStateVars={props.userPromptedStateVars}
          />
        </div>
      )}
      <div className="flex gap-2 px-4 my-2">
        <div className="flex-1">
          <button
            className={`${buttonBgColor} w-full py-2 text-xs font-semibold text-center rounded-md text-bluev3-main`}
            data-cy="add-warmup-set"
            onClick={() => {
              updateProgress(
                props.dispatch,
                [props.lbWarmupSets.recordModify((sets) => Reps.addSet(sets, props.settings.units, undefined, true))],
                "add-warmupset"
              );
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
            data-cy="add-workout-set"
            onClick={() => {
              updateProgress(
                props.dispatch,
                [
                  props.lbSets.recordModify((sets) =>
                    Reps.addSet(
                      sets,
                      props.settings.units,
                      props.lastSets ? props.lastSets[props.lastSets.length - 1] : undefined
                    )
                  ),
                ],
                "add-set"
              );
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
