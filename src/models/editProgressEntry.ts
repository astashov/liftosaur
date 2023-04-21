import { IDispatch } from "../ducks/types";
import { lb } from "lens-shmens";
import { IState } from "./state";
import { IProgramExercise, ISet, IEquipment } from "../types";

export namespace EditProgressEntry {
  export function showEditSetModal(
    dispatch: IDispatch,
    progressId: number,
    isWarmup: boolean,
    entryIndex: number,
    setIndex?: number,
    programExercise?: IProgramExercise,
    equipment?: IEquipment
  ): void {
    dispatch({
      type: "UpdateState",
      lensRecording: [
        lb<IState>().p("progress").pi(progressId).pi("ui").p("editSetModal").record({
          programExercise,
          isWarmup,
          entryIndex,
          setIndex,
          equipment,
        }),
      ],
    });
  }

  export function hideEditSetModal(dispatch: IDispatch, progressId: number): void {
    dispatch({
      type: "UpdateState",
      lensRecording: [lb<IState>().p("progress").pi(progressId).pi("ui").p("editSetModal").record(undefined)],
    });
  }

  export function editSet(
    dispatch: IDispatch,
    progressId: number,
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
            .pi(progressId)
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
            .pi(progressId)
            .p("entries")
            .i(entryIndex)
            .p(isWarmup ? "warmupSets" : "sets")
            .recordModify((sets) => [...sets, set]),
        ],
      });
    }
    hideEditSetModal(dispatch, progressId);
  }

  export function removeSet(
    dispatch: IDispatch,
    progressId: number,
    isWarmup: boolean,
    entryIndex: number,
    setIndex: number
  ): void {
    dispatch({
      type: "UpdateState",
      lensRecording: [
        lb<IState>()
          .p("progress")
          .pi(progressId)
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
