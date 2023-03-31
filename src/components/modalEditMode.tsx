import { JSX, h } from "preact";
import { Modal } from "./modal";
import { Button } from "./button";
import { ISettings, IProgramExercise, IProgram } from "../types";
import { Exercise } from "../models/exercise";
import { IDispatch } from "../ducks/types";
import { IState, updateState } from "../models/state";
import { lb } from "lens-shmens";
import { EditProgram } from "../models/editProgram";

interface IModalEditModeProps {
  programExercise: IProgramExercise;
  program: IProgram;
  entryIndex: number;
  progressId: number;
  settings: ISettings;
  dispatch: IDispatch;
}

export function ModalEditMode(props: IModalEditModeProps): JSX.Element {
  const exercise = Exercise.get(props.programExercise.exerciseType, props.settings.exercises);
  const onClose = (): void => {
    updateState(props.dispatch, [
      lb<IState>().p("progress").pi(props.progressId).pi("ui").p("editModal").record(undefined),
    ]);
  };
  return (
    <Modal shouldShowClose={true} onClose={onClose}>
      <div style={{ minWidth: "80%" }} className="text-center" data-cy="modal-edit-mode">
        <h2 className="text-lg font-bold">Edit {exercise.name} exercise</h2>
        <div className="mt-4">
          <Button
            kind="orange"
            onClick={() => {
              updateState(props.dispatch, [
                lb<IState>()
                  .p("progress")
                  .pi(props.progressId)
                  .pi("ui")
                  .p("entryIndexEditMode")
                  .record(props.entryIndex),
                lb<IState>().p("progress").pi(props.progressId).pi("ui").p("exerciseBottomSheet").record(undefined),
              ]);
              onClose();
            }}
            data-cy="modal-edit-mode-this-workout"
          >
            Only in this workout
          </Button>
        </div>
        <div className="flex items-center mt-4 font-bold">
          <div className="flex-1 mr-4 bg-grayv2-100" style={{ height: "1px" }} />
          <div>or</div>
          <div className="flex-1 ml-4 bg-grayv2-100" style={{ height: "1px" }} />
        </div>
        <div className="mt-4">
          <Button
            kind="purple"
            onClick={() => {
              updateState(props.dispatch, [lb<IState>().p("editProgram").record({ id: props.program.id })]);
              EditProgram.editProgramExercise(props.dispatch, props.programExercise);
              onClose();
            }}
            data-cy="modal-edit-mode-program"
          >
            In a program
          </Button>
          <div className="w-48 mx-auto mt-1 text-xs text-grayv2-main ">
            So it will apply to <strong>this workout</strong> and <strong>all future workouts</strong>
          </div>
        </div>
      </div>
    </Modal>
  );
}
