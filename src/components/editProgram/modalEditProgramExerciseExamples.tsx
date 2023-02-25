/* eslint-disable @typescript-eslint/ban-types */
import { h, JSX } from "preact";
import { IDispatch } from "../../ducks/types";
import { EditProgram } from "../../models/editProgram";
import { IUnit } from "../../types";
import { Modal } from "../modal";
import { EditProgramExerciseExamples } from "./editProgramExerciseExamples";

interface IModalEditProgramExerciseExamplesProps {
  dispatch: IDispatch;
  unit: IUnit;
  onClose: () => void;
}

export function ModalEditProgramExerciseExamples(props: IModalEditProgramExerciseExamplesProps): JSX.Element {
  return (
    <Modal shouldShowClose={true} onClose={props.onClose} isFullWidth={true}>
      <EditProgramExerciseExamples
        unit={props.unit}
        onSelect={(e) => {
          if (confirm("Are you sure? This will overwrite your current exercise.")) {
            window.isUndoing = true;
            EditProgram.applyProgramExerciseExample(props.dispatch, e);
            props.onClose();
          }
        }}
      />
    </Modal>
  );
}
