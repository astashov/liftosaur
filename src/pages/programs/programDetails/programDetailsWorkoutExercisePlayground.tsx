import { h } from "preact";
import { JSX, memo } from "preact/compat";
import { ExerciseImage } from "../../../components/exerciseImage";
import { ExerciseSets } from "../../../components/exerciseSets";
import { Markdown } from "../../../components/markdown";
import { equipmentName, Exercise } from "../../../models/exercise";
import { IHistoryEntry, IHistoryRecord, IProgramExercise, IProgramState, ISettings } from "../../../types";
import { ComparerUtils } from "../../../utils/comparer";
import { IDispatch } from "../../../ducks/types";
import { Reps } from "../../../models/set";
import { ProgressStateChanges } from "../../../components/progressStateChanges";
import { ProgramExercise } from "../../../models/programExercise";
import { IconCheckCircle } from "../../../components/icons/iconCheckCircle";
import { IconEditSquare } from "../../../components/icons/iconEditSquare";
import { lb } from "lens-shmens";

interface IProps {
  entry: IHistoryEntry;
  programExercise: IProgramExercise;
  allProgramExercises?: IProgramExercise[];
  settings: ISettings;
  progress: IHistoryRecord;
  dayIndex: number;
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

export const ProgramDetailsWorkoutExercisePlayground = memo((props: IProps): JSX.Element => {
  const exercise = Exercise.get(props.entry.exercise, props.settings.exercises);
  const warmupSets = props.entry.warmupSets;
  const equipment = exercise.equipment;
  const programExercise = props.programExercise;
  const description = ProgramExercise.getDescription(
    programExercise,
    props.allProgramExercises || [],
    props.dayIndex,
    props.settings,
    props.staticState
  );

  return (
    <div className={`px-2 pt-2 pb-2 mb-3 rounded-lg ${getBgColor100(props.entry)} relative`}>
      <div className="flex items-center">
        <div
          className="absolute z-0 px-2 py-1 leading-none rounded-full bg-grayv2-100"
          style={{ right: -12, top: -18 }}
        >
          <button
            className="inline-block mr-2"
            onClick={() => {
              props.dispatch({
                type: "UpdateProgress",
                lensRecordings: [
                  lb<IHistoryRecord>()
                    .pi("ui")
                    .p("editModal")
                    .record({ programExercise: programExercise, entryIndex: props.index }),
                ],
              });
            }}
          >
            <IconEditSquare />
          </button>
          <button
            className="inline-block"
            onClick={() => {
              props.dispatch({
                type: "UpdateProgress",
                lensRecordings: [
                  lb<IHistoryRecord>()
                    .pi("entries")
                    .i(props.index)
                    .p("sets")
                    .recordModify((sets) => sets.map((s) => ({ ...s, completedReps: s.reps }))),
                  lb<IHistoryRecord>()
                    .pi("entries")
                    .i(props.index)
                    .p("warmupSets")
                    .recordModify((sets) => sets.map((s) => ({ ...s, completedReps: s.reps }))),
                ],
              });
            }}
          >
            <IconCheckCircle isChecked={true} color={Reps.isCompleted(props.entry.sets) ? "#38A169" : "#BAC4CD"} />
          </button>
        </div>
        <div style={{ width: "40px" }} className="mr-1">
          <ExerciseImage className="w-full" exerciseType={exercise} size="small" />
        </div>
        <div className="flex-1 ml-auto" style={{ minWidth: "6rem" }}>
          <div className="flex items-center">
            <div className="flex-1 mr-1 font-bold">{exercise.name}</div>
          </div>
          {equipment && <div className="text-sm text-grayv2-600">{equipmentName(equipment)}</div>}
        </div>
        <section className="flex flex-wrap mt-1 ml-1">
          <ExerciseSets
            isEditMode={false}
            warmupSets={warmupSets}
            index={props.index}
            progress={props.progress}
            programExercise={props.programExercise}
            allProgramExercises={props.allProgramExercises}
            showHelp={false}
            settings={props.settings}
            size="small"
            entry={props.entry}
            friend={undefined}
            onStartSetChanging={() => undefined}
            onChangeReps={() => undefined}
            dispatch={props.dispatch}
          />
        </section>
      </div>
      {description && (
        <div className="mt-1">
          <Markdown value={description} />
        </div>
      )}
      {props.programExercise && props.allProgramExercises && (
        <ProgressStateChanges
          entry={props.entry}
          forceShow={false}
          settings={props.settings}
          day={props.dayIndex}
          state={ProgramExercise.getState(props.programExercise, props.allProgramExercises)}
          userPromptedStateVars={props.progress.userPromptedStateVars?.[props.programExercise.id]}
          script={ProgramExercise.getFinishDayScript(props.programExercise, props.allProgramExercises)}
          staticState={props.staticState}
        />
      )}
    </div>
  );
}, ComparerUtils.noFns);
