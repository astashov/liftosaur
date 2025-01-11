/* eslint-disable @typescript-eslint/ban-types */
import React, { JSX } from "react";
import { IDispatch } from "../../ducks/types";
import { EditProgram } from "../../models/editProgram";
import { IUnit } from "../../types";
import { LftModal } from "../modal";
import { EditProgramExerciseExamples } from "./editProgramExerciseExamples";

interface IModalEditProgramExerciseExamplesProps {
  dispatch: IDispatch;
  unit: IUnit;
  onClose: () => void;
}

export function ModalEditProgramExerciseExamples(props: IModalEditProgramExerciseExamplesProps): JSX.Element {
  return (
    <LftModal shouldShowClose={true} onClose={props.onClose} isFullWidth={true}>
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
    </LftModal>
  );
}
