/* eslint-disable @typescript-eslint/ban-types */
import React, { JSX } from "react";
import { Modal } from "../../../components/modal";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IProgramEditorState } from "../models/types";
import { EditProgramExerciseExamples } from "../../../components/editProgram/editProgramExerciseExamples";
import { lb, LensBuilder } from "lens-shmens";
import { EditProgramLenses } from "../../../models/editProgramLenses";
import { IProgramExercise, IUnit } from "../../../types";

interface IProgramContentModalExerciseExamplesProps {
  unit: IUnit;
  dispatch: ILensDispatch<IProgramEditorState>;
  lbe: LensBuilder<IProgramEditorState, IProgramExercise, {}>;
}

export function ProgramContentModalExerciseExamples(props: IProgramContentModalExerciseExamplesProps): JSX.Element {
  return (
    <Modal
      shouldShowClose={true}
      onClose={() =>
        props.dispatch(lb<IProgramEditorState>().p("ui").p("showExamplesForExerciseKey").record(undefined))
      }
    >
      <div style={{ maxWidth: "900px" }} className="px-4">
        <EditProgramExerciseExamples
          unit={props.unit}
          onSelect={(e) => {
            if (confirm("Are you sure? This will overwrite your current exercise.")) {
              window.isUndoing = true;
              props.dispatch([
                EditProgramLenses.applyProgramExerciseExample(props.lbe, e),
                lb<IProgramEditorState>().p("ui").p("showExamplesForExerciseKey").record(undefined),
              ]);
            }
          }}
        />
      </div>
    </Modal>
  );
}
