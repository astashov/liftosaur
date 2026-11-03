import { ILiftographEditorSnapshot } from "./liftographCompletions";

export function LiftographEditorEdits_typed(text: string, caret: number): ILiftographEditorSnapshot {
  return { text, start: caret, end: caret };
}

export function LiftographEditorEdits_selected(
  state: ILiftographEditorSnapshot,
  start: number,
  end: number
): ILiftographEditorSnapshot {
  return { ...state, start, end };
}

export function LiftographEditorEdits_canComplete(state: ILiftographEditorSnapshot): boolean {
  return state.start === state.end;
}
