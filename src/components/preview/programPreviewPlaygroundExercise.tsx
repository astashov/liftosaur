import { h } from "preact";
import { JSX, memo } from "preact/compat";
import { ExerciseImage } from "../exerciseImage";
import { Markdown } from "../markdown";
import { equipmentName, Exercise } from "../../models/exercise";
import { IHistoryEntry, IHistoryRecord, IProgramState, ISettings } from "../../types";
import { ComparerUtils } from "../../utils/comparer";
import { IDispatch } from "../../ducks/types";
import { Reps } from "../../models/set";
import { IconCheckCircle } from "../icons/iconCheckCircle";
import { IconEditSquare } from "../icons/iconEditSquare";
import { lb } from "lens-shmens";
import { IEvaluatedProgram, Program } from "../../models/program";
import { HistoryRecordSetsView } from "../historyRecordSets";
import { StringUtils } from "../../utils/string";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { PlannerProgramExercise } from "../../pages/planner/models/plannerProgramExercise";
import { WorkoutExerciseAllSets } from "../workoutExerciseAllSets";
import { WorkoutExerciseUtils } from "../../utils/workoutExerciseUtils";

interface IProps {
  entry: IHistoryEntry;
  programExercise: IPlannerProgramExercise;
  program: IEvaluatedProgram;
  settings: ISettings;
  progress: IHistoryRecord;
  dayIndex: number;
  isPlayground: boolean;
  index: number;
  staticState?: IProgramState;
  dispatch: IDispatch;
}

function getColor(entry: IHistoryEntry): string {
  if (entry.sets.length === 0) {
    return "purple";
  }
  if (Reps.isFinished(entry.sets)) {
    if (Reps.isCompleted(entry.sets)) {
      return "green";
    } else {
      return "red";
    }
  } else {
    return "purple";
  }
}

function getBgColor100(entry: IHistoryEntry): string {
  const color = getColor(entry);
  if (color === "green") {
    return "bg-greenv2-100";
  } else if (color === "red") {
    return "bg-redv2-100";
  } else {
    return "bg-purplev2-100";
  }
}

export const ProgramPreviewPlaygroundExercise = memo((props: IProps): JSX.Element => {
  return props.isPlayground ? (
    <ProgramPreviewPlayground
      entry={props.entry}
      programExercise={props.programExercise}
      program={props.program}
      settings={props.settings}
      progress={props.progress}
      dayIndex={props.dayIndex}
      index={props.index}
      staticState={props.staticState}
      dispatch={props.dispatch}
    />
  ) : (
    <ProgramPreviewHistoryRecordSets
      entry={props.entry}
      programExercise={props.programExercise}
      settings={props.settings}
      index={props.index}
      dispatch={props.dispatch}
    />
  );
}, ComparerUtils.noFns);

interface IProgramPreviewHistoryRecordSetsProps {
  entry: IHistoryEntry;
  programExercise: IPlannerProgramExercise;
  settings: ISettings;
  index: number;
  dispatch: IDispatch;
}

function ProgramPreviewHistoryRecordSets(props: IProgramPreviewHistoryRecordSetsProps): JSX.Element {
  const exercise = Exercise.get(props.entry.exercise, props.settings.exercises);
  const equipment = exercise.equipment;
  const programExercise = props.programExercise;
  const description = PlannerProgramExercise.currentDescription(programExercise);

  return (
    <div
      className={`py-2 px-4 mx-4 mb-3 rounded-lg ${getBgColor100(props.entry)} relative`}
      data-cy={StringUtils.dashcase(exercise.name)}
    >
      <div className="flex items-center">
        <PlaygroundExerciseTopBar
          dispatch={props.dispatch}
          index={props.index}
          entry={props.entry}
          programExercise={props.programExercise}
          isPlayground={false}
        />
        <div style={{ width: "40px" }} className="mr-1">
          <ExerciseImage settings={props.settings} className="w-full" exerciseType={exercise} size="small" />
        </div>
        <div className="flex-1 ml-auto text-sm" style={{ minWidth: "4rem" }}>
          <div className="flex items-center">
            <div className="flex-1 mr-1 font-bold">{exercise.name}</div>
          </div>
          {equipment && <div className="text-sm text-grayv2-600">{equipmentName(equipment)}</div>}
        </div>
        <section className="mt-1 ml-1">
          <HistoryRecordSetsView sets={props.entry.sets} settings={props.settings} isNext={true} />
        </section>
      </div>
      {description && (
        <div className="mt-1 text-sm">
          <Markdown value={description} />
        </div>
      )}
    </div>
  );
}

interface IProgramPreviewPlaygroundProps {
  entry: IHistoryEntry;
  programExercise: IPlannerProgramExercise;
  program: IEvaluatedProgram;
  settings: ISettings;
  progress: IHistoryRecord;
  dayIndex: number;
  index: number;
  staticState?: IProgramState;
  dispatch: IDispatch;
}

function ProgramPreviewPlayground(props: IProgramPreviewPlaygroundProps): JSX.Element {
  const exercise = Exercise.get(props.entry.exercise, props.settings.exercises);
  const equipment = exercise.equipment;
  const programExercise = props.programExercise;
  const dayData = Program.getDayData(props.program, props.dayIndex);
  const description = PlannerProgramExercise.currentDescription(programExercise);

  return (
    <div
      className={`pt-2 pb-2 mb-6 rounded-lg ${WorkoutExerciseUtils.getBgColor50(props.entry.sets, false)} relative`}
      data-cy={`entry-${StringUtils.dashcase(exercise.name)}`}
    >
      <div>
        <PlaygroundExerciseTopBar
          dispatch={props.dispatch}
          index={props.index}
          entry={props.entry}
          programExercise={props.programExercise}
          isPlayground={true}
          xOffset={20}
        />
        <div className="flex items-center mx-4">
          <div style={{ width: "40px" }} className="mr-1">
            <ExerciseImage settings={props.settings} className="w-full" exerciseType={exercise} size="small" />
          </div>
          <div className="flex-1 ml-auto" style={{ minWidth: "4rem" }}>
            <div className="flex items-center">
              <div className="flex-1 mr-1 font-bold">{exercise.name}</div>
            </div>
            {equipment && <div className="text-sm text-grayv2-600">{equipmentName(equipment)}</div>}
          </div>
        </div>
        {description && (
          <div className="mx-4 mt-1 text-sm">
            <Markdown value={description} />
          </div>
        )}
        <section className="mt-1">
          <WorkoutExerciseAllSets
            day={dayData.day}
            isCurrentProgress={true}
            program={props.program}
            programExercise={props.programExercise}
            entry={props.entry}
            entryIndex={props.index}
            otherStates={props.program.states}
            userPromptedStateVars={props.progress.userPromptedStateVars?.[props.programExercise.key]}
            exerciseType={props.entry.exercise}
            lbSets={lb<IHistoryRecord>().p("entries").i(props.index).p("sets")}
            lbWarmupSets={lb<IHistoryRecord>().p("entries").i(props.index).p("warmupSets")}
            settings={props.settings}
            dispatch={props.dispatch}
            subscription={undefined}
          />
        </section>
      </div>
    </div>
  );
}

interface IPlaygroundExerciseTopBarProps {
  dispatch: IDispatch;
  index: number;
  entry: IHistoryEntry;
  programExercise: IPlannerProgramExercise;
  isPlayground: boolean;
  xOffset?: number;
}

function PlaygroundExerciseTopBar(props: IPlaygroundExerciseTopBarProps): JSX.Element {
  return (
    <div
      className="absolute z-0 px-2 py-1 leading-none rounded-full bg-grayv2-100"
      style={{ right: -12 + (props.xOffset ?? 0), top: -18 }}
    >
      <button
        className="inline-block mr-2 nm-program-details-playground-edit"
        data-cy="program-preview-edit-exercise"
        onClick={() => {
          props.dispatch({
            type: "UpdateProgress",
            lensRecordings: [
              lb<IHistoryRecord>()
                .pi("ui")
                .p("editModal")
                .record({ programExerciseId: props.programExercise.key, entryIndex: props.index }),
            ],
            desc: "open-edit-exercise-modal",
          });
        }}
      >
        <IconEditSquare />
      </button>
      {props.isPlayground && (
        <button
          className="inline-block nm-program-details-playground-complete"
          data-cy="program-preview-complete-exercise"
          onClick={() => {
            props.dispatch({
              type: "UpdateProgress",
              lensRecordings: [
                lb<IHistoryRecord>()
                  .pi("entries")
                  .i(props.index)
                  .p("sets")
                  .recordModify((sets) =>
                    sets.map((s) => {
                      const newSet = { ...s, completedReps: s.reps, completedWeight: s.weight };
                      return newSet.completedReps != null && newSet.completedWeight != null
                        ? { ...newSet, isCompleted: true }
                        : s;
                    })
                  ),
                lb<IHistoryRecord>()
                  .pi("entries")
                  .i(props.index)
                  .p("warmupSets")
                  .recordModify((sets) =>
                    sets.map((s) => {
                      const newSet = { ...s, completedReps: s.reps, completedWeight: s.weight };
                      return newSet.completedReps != null && newSet.completedWeight != null
                        ? { ...newSet, isCompleted: true }
                        : s;
                    })
                  ),
              ],
              desc: "complete-all-sets",
            });
          }}
        >
          <IconCheckCircle isChecked={true} color={Reps.isCompleted(props.entry.sets) ? "#38A169" : "#BAC4CD"} />
        </button>
      )}
    </div>
  );
}
