import { IProgram, ISettings, IProgramExercise } from "../../../types";

export interface IProgramEditorState {
  settings: ISettings;
  program: IProgram;
  editExercises: Partial<Record<string, IProgramExercise>>;
}
