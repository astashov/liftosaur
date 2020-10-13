import { lb } from "../utils/lens";
import { IDispatch } from "../ducks/types";
import { updateState, IState } from "./state";

export namespace Help {
  export function markSeen(dispatch: IDispatch, ids: string[]): void {
    updateState(dispatch, [
      lb<IState>()
        .p("storage")
        .p("helps")
        .recordModify((helps) => {
          const set = new Set(helps);
          for (const id of ids) {
            set.add(id);
          }
          return Array.from(set);
        }),
    ]);
  }
}
