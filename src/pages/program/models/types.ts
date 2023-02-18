import { IProgram, ISettings, IProgramExercise } from "../../../types";

export interface IProgramEditorState {
  settings: ISettings;
  program: IProgram;
  history: {
    past: IProgram[];
    future: IProgram[];
  };
  editExercises: Partial<Record<string, IProgramExercise>>;
}
