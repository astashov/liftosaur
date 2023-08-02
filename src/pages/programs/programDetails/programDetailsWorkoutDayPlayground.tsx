import { h, JSX } from "preact";
import { memo } from "preact/compat";
import { useCallback } from "preact/hooks";
import { buildCardsReducer, ICardsAction } from "../../../ducks/reducer";
import { IHistoryRecord, IProgram, IProgramState, ISettings } from "../../../types";
import { IDispatch } from "../../../ducks/types";
import { ProgramDetailsWorkoutExercisePlayground } from "./programDetailsWorkoutExercisePlayground";
import { ModalAmrap } from "../../../components/modalAmrap";
import { ModalWeight } from "../../../components/modalWeight";
import { ModalStateVarsUserPrompt } from "../../../components/modalStateVarsUserPrompt";
import { ProgramDetailsWorkoutExerciseEditModal } from "./programDetailsWorkoutExerciseEditModal";
import { lb } from "lens-shmens";
import { EditProgramLenses } from "../../../models/editProgramLenses";
import { Button } from "../../../components/button";
import { ModalEditSet } from "../../../components/modalEditSet";
import { EditProgressEntry } from "../../../models/editProgressEntry";

interface IProgramDetailsPlaygroundDayProps {
  program: IProgram;
  weekName?: string;
  dayIndex: number;
  settings: ISettings;
  progress: IHistoryRecord;
  staticStates: Partial<Record<string, IProgramState>>;
  onProgressChange: (newProgress: IHistoryRecord) => void;
  onProgramChange: (newProgram: IProgram) => void;
  onFinish: () => void;
}

export const ProgramDetailsWorkoutDayPlayground = memo(
  (props: IProgramDetailsPlaygroundDayProps): JSX.Element => {
    const dispatch: IDispatch = useCallback(
      async (action) => {
        const newProgress = buildCardsReducer(props.settings)(props.progress, action as ICardsAction);
        props.onProgressChange(newProgress);
      },
      [props.settings, props.progress]
    );

    const editModalProgramExercise = props.progress.ui?.editModal?.programExercise;

    return (
      <div>
        <h3 className="mb-1 text-lg font-bold">
          {props.weekName ? `${props.weekName} - ` : ""}
          {props.program.days[props.dayIndex - 1].name}
        </h3>
        {props.progress.entries.map((entry, index) => {
          const programExercise = props.program.exercises.find((e) => e.id === entry.programExerciseId)!;
          const staticState = props.staticStates[programExercise.id];
          return (
            <ProgramDetailsWorkoutExercisePlayground
              entry={entry}
              dayIndex={props.dayIndex}
              progress={props.progress}
              staticState={staticState}
              programExercise={programExercise}
              allProgramExercises={props.program.exercises}
              index={index}
              settings={props.settings}
              dispatch={dispatch}
            />
          );
        })}
        <div className="text-center">
          <Button kind="orange" onClick={props.onFinish}>
            Finish this day
          </Button>
        </div>
        <ModalAmrap
          isHidden={props.progress.ui?.amrapModal == null}
          dispatch={dispatch}
          initialReps={
            props.progress.entries[props.progress.ui?.amrapModal?.entryIndex || 0]?.sets[
              props.progress.ui?.amrapModal?.setIndex || 0
            ]?.completedReps
          }
          initialRpe={
            props.progress.entries[props.progress.ui?.amrapModal?.entryIndex || 0]?.sets[
              props.progress.ui?.amrapModal?.setIndex || 0
            ]?.completedRpe
          }
          isAmrap={props.progress.ui?.amrapModal?.isAmrap || false}
          logRpe={props.progress.ui?.amrapModal?.logRpe || false}
        />
        <ModalWeight
          isHidden={props.progress.ui?.weightModal == null}
          programExercise={props.progress.ui?.weightModal?.programExercise}
          units={props.settings.units}
          dispatch={dispatch}
          weight={props.progress.ui?.weightModal?.weight ?? 0}
        />
        <ModalStateVarsUserPrompt
          programExercise={props.progress.ui?.stateVarsUserPromptModal?.programExercise}
          allProgramExercises={props.program.exercises}
          isHidden={props.progress.ui?.stateVarsUserPromptModal?.programExercise == null}
          dispatch={dispatch}
        />
        <ModalEditSet
          isHidden={props.progress.ui?.editSetModal == null}
          setsLength={props.progress.entries[props.progress.ui?.editSetModal?.entryIndex || 0]?.sets.length || 0}
          key={props.progress.ui?.editSetModal?.setIndex}
          subscription={{ google: { fake: null }, apple: {} }}
          progressId={props.progress.id}
          dispatch={dispatch}
          settings={props.settings}
          equipment={props.progress.ui?.editSetModal?.equipment}
          programExercise={props.progress.ui?.editSetModal?.programExercise}
          allProgramExercises={props.program.exercises}
          isTimerDisabled={true}
          set={EditProgressEntry.getEditSetData(props.progress)}
          isWarmup={props.progress.ui?.editSetModal?.isWarmup || false}
          entryIndex={props.progress.ui?.editSetModal?.entryIndex || 0}
          setIndex={props.progress.ui?.editSetModal?.setIndex}
        />
        {editModalProgramExercise && (
          <ProgramDetailsWorkoutExerciseEditModal
            onClose={() =>
              dispatch({
                type: "UpdateProgress",
                lensRecordings: [lb<IHistoryRecord>().pi("ui").p("editModal").record(undefined)],
              })
            }
            onEditStateVariable={(stateKey, newValue) => {
              const lensRecording = EditProgramLenses.properlyUpdateStateVariable(
                lb<IProgram>()
                  .pi("exercises")
                  .find((e) => e.id === editModalProgramExercise.id),
                editModalProgramExercise,
                stateKey,
                newValue
              );
              const newProgram = lensRecording.reduce((acc, lens) => lens.fn(acc), props.program);
              props.onProgramChange(newProgram);
            }}
            programExercise={editModalProgramExercise}
            settings={props.settings}
          />
        )}
      </div>
    );
  }
);
