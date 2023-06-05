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
        <ModalAmrap isHidden={props.progress.ui?.amrapModal == null} dispatch={dispatch} />
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
