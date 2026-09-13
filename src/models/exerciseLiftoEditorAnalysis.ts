export interface IExerciseLiftoEditorAnalysisState {
  lastKey: string | undefined;
}

export function ExerciseLiftoEditorAnalysis_initial(): IExerciseLiftoEditorAnalysisState {
  return { lastKey: undefined };
}

// The program is half of what a pass reads, so the host's revision is part of the key: a sheet
// stacked on top can save an exercise this one resolves through while neither text moves.
export function ExerciseLiftoEditorAnalysis_key(revision: number, withPreview: boolean, text: string): string {
  return `${revision}:${withPreview}:${text}`;
}

export function ExerciseLiftoEditorAnalysis_shouldRun(state: IExerciseLiftoEditorAnalysisState, key: string): boolean {
  return state.lastKey !== key;
}

export function ExerciseLiftoEditorAnalysis_ran(
  state: IExerciseLiftoEditorAnalysisState,
  key: string
): IExerciseLiftoEditorAnalysisState {
  return state.lastKey === key ? state : { lastKey: key };
}
