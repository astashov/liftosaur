import { IProgram, ISettings, IProgramExercise } from "../../../types";

export interface IProgramEditorState {
  settings: ISettings;
  program: IProgram;
  exercises: Partial<Record<string, IProgramExercise>>;
}
