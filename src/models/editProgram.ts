import { lb } from "../utils/lens";
import { IState, updateState } from "../ducks/reducer";
import { IProgramDayEntry2 } from "./program";
import { IDispatch } from "../ducks/types";

export namespace EditProgram {
  export function removeEntry(
    dispatch: IDispatch,
    entry: IProgramDayEntry2,
    programIndex: number,
    dayIndex: number
  ): void {
    updateState(dispatch, [
      lb<IState>()
        .p("storage")
        .p("programs")
        .i(programIndex)
        .p("days")
        .i(dayIndex)
        .p("excercises")
        .recordModify((entries) => entries.filter((e) => e !== entry)),
    ]);
  }
}
