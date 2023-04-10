import { IProgram, ISettings, IProgramExercise } from "../../../types";
import { IUndoRedoState } from "../../builder/utils/undoredo";

export interface IProgramEditorUiSelected {
  dayIndex?: number;
  exerciseId: string;
}

export interface IProgramEditorState
  extends IUndoRedoState<{ program: IProgram; editExercises: Partial<Record<string, IProgramExercise>> }> {
  settings: ISettings;
  ui: {
    showExamplesForExerciseKey?: string;
    selected: IProgramEditorUiSelected[];
  };
}
