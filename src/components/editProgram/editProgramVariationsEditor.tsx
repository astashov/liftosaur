import React, { JSX } from "react";
import { IProgramExercise } from "../../types";
import { IEither } from "../../utils/types";
import { GroupHeader } from "../groupHeader";
import { MultiLineTextEditor } from "./multiLineTextEditor";

interface IEditProgramVariationsEditorProps {
  programExercise: IProgramExercise;
  editorResult: IEither<number, string>;
  onChange: (value: string) => void;
}

export function EditProgramVariationsEditor(props: IEditProgramVariationsEditorProps): JSX.Element {
  const { programExercise } = props;

  return (
    <>
      <GroupHeader
        name="Variation Selection Script"
        help={
          <span>
            Liftoscript script, it should return Variation number (e.g. <strong>1</strong> or <strong>2</strong>), and
            that variation will be used in the workout.
          </span>
        }
      />
      <MultiLineTextEditor
        name="variation"
        state={programExercise.state}
        result={props.editorResult}
        value={programExercise.variationExpr}
        height={4}
        onChange={props.onChange}
      />
    </>
  );
}
