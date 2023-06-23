import { IDispatch } from "../ducks/types";
import { lb } from "lens-shmens";
import { IState } from "./state";
import { IProgramExercise, ISet, IEquipment, IHistoryRecord } from "../types";

export namespace EditProgressEntry {
  export function showEditSetModal(
    dispatch: IDispatch,
    isWarmup: boolean,
    entryIndex: number,
    setIndex?: number,
    programExercise?: IProgramExercise,
    equipment?: IEquipment
  ): void {
    dispatch({
      type: "UpdateProgress",
      lensRecordings: [
        lb<IHistoryRecord>().pi("ui").p("editSetModal").record({
          programExercise,
          isWarmup,
          entryIndex,
          setIndex,
          equipment,
        }),
      ],
    });
  }

  export function hideEditSetModal(dispatch: IDispatch): void {
    dispatch({
      type: "UpdateProgress",
      lensRecordings: [lb<IHistoryRecord>().pi("ui").p("editSetModal").record(undefined)],
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
        type: "UpdateProgress",
        lensRecordings: [
          lb<IHistoryRecord>()
            .p("entries")
            .i(entryIndex)
            .p(isWarmup ? "warmupSets" : "sets")
            .i(setIndex)
            .recordModify((oldSet) => ({
              ...oldSet,
              ...set,
            })),
          lb<IHistoryRecord>().pi("ui").p("editSetModal").record(undefined),
        ],
      });
    } else {
      dispatch({
        type: "UpdateProgress",
        lensRecordings: [
          lb<IHistoryRecord>()
            .p("entries")
            .i(entryIndex)
            .p(isWarmup ? "warmupSets" : "sets")
            .recordModify((sets) => [...sets, set]),
          lb<IHistoryRecord>().pi("ui").p("editSetModal").record(undefined),
        ],
      });
    }
  }

  export function getEditSetData(progress: IHistoryRecord): ISet | undefined {
    const uiData = progress.ui?.editSetModal;
    if (uiData != null && uiData.setIndex != null) {
      const entry = progress.entries[uiData.entryIndex];
      if (entry != null) {
        const set = uiData.isWarmup ? entry.warmupSets[uiData.setIndex] : entry.sets[uiData.setIndex];
        return set;
      }
    }
    return undefined;
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
