import { lb } from "../utils/lens";
import { IState, updateState } from "../ducks/reducer";
import { IDispatch } from "../ducks/types";

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
