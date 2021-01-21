import { IDispatch } from "../ducks/types";
import { lb } from "lens-shmens";
import { IState } from "./state";
import { ISet } from "./set";

export namespace EditProgressEntry {
  export function showEditSetModal(
    dispatch: IDispatch,
    isWarmup: boolean,
    entryIndex: number,
    setIndex?: number
  ): void {
    dispatch({
      type: "UpdateState",
      lensRecording: [
        lb<IState>().p("progress").pi(0).pi("ui").p("editSetModal").record({
          isWarmup,
          entryIndex,
          setIndex,
        }),
      ],
    });
  }

  export function hideEditSetModal(dispatch: IDispatch): void {
    dispatch({
      type: "UpdateState",
      lensRecording: [lb<IState>().p("progress").pi(0).pi("ui").p("editSetModal").record(undefined)],
    });
  }

  export function editSet(
    dispatch: IDispatch,
    isWarmup: boolean,
    set: ISet,
    entryIndex: number,
    setIndex?: number
  ): void {
    if (entryIndex != null && setIndex != null) {
      dispatch({
        type: "UpdateState",
        lensRecording: [
          lb<IState>()
            .p("progress")
            .pi(0)
            .p("entries")
            .i(entryIndex)
            .p(isWarmup ? "warmupSets" : "sets")
            .i(setIndex)
            .recordModify((oldSet) => ({
              ...oldSet,
              ...set,
            })),
        ],
      });
    } else {
      dispatch({
        type: "UpdateState",
        lensRecording: [
          lb<IState>()
            .p("progress")
            .pi(0)
            .p("entries")
            .i(entryIndex)
            .p(isWarmup ? "warmupSets" : "sets")
            .recordModify((sets) => [...sets, set]),
        ],
      });
    }
    hideEditSetModal(dispatch);
  }

  export function removeSet(dispatch: IDispatch, isWarmup: boolean, entryIndex: number, setIndex: number): void {
    dispatch({
      type: "UpdateState",
      lensRecording: [
        lb<IState>()
          .p("progress")
          .pi(0)
          .p("entries")
          .i(entryIndex)
          .p(isWarmup ? "warmupSets" : "sets")
          .recordModify((sets) => {
            const newSets = [...sets];
            newSets.splice(setIndex, 1);
            return newSets;
          }),
      ],
    });
  }
}
