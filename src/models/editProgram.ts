import { lb } from "../utils/lens";
import { IState, updateState } from "../ducks/reducer";
import { IProgramDayEntry2 } from "./program";
import { IDispatch } from "../ducks/types";

export namespace EditProgram {
  export function removeEntry(dispatch: IDispatch, entry: IProgramDayEntry2): void {
    updateState(dispatch, [
      lb<IState>()
        .pi("editProgram")
        .pi("editDay")
        .p("day")
        .p("excercises")
        .recordModify((entries) => entries.filter((e) => e !== entry)),
    ]);
  }
}
