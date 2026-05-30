import { ILensRecordingPayload, LensBuilder, LensError } from "lens-shmens";
import { IState, updateState } from "../models/state";
import { IDispatch } from "../ducks/types";
import { ILensDispatch } from "./useLensReducer";
import { IUndoRedoState, undoRedoMiddleware } from "../pages/builder/utils/undoredo";

export function buildPlannerDispatch<T, S extends IUndoRedoState<T>, O = never>(
  dispatch: IDispatch,
  lensBuilder: LensBuilder<IState, S, {}, O>,
  plannerStateOrGetter: S | (() => S | undefined)
): ILensDispatch<S> {
  const getPlannerState = (): S | undefined =>
    typeof plannerStateOrGetter === "function" ? (plannerStateOrGetter as () => S | undefined)() : plannerStateOrGetter;
  const plannerDispatch = (
    lensRecording: ILensRecordingPayload<S> | ILensRecordingPayload<S>[],
    desc: string
  ): void => {
    const lensRecordings = Array.isArray(lensRecording) ? lensRecording : [lensRecording];
    try {
      updateState(
        dispatch,
        lensRecordings.map((recording) => recording.prepend(lensBuilder)),
        desc || "Update state"
      );
    } catch (e) {
      // Screen may have been removed from the stack by the time a delayed dispatch fires
      // (e.g. InputNumber2 onBlur setTimeout racing with PullScreen)
      if (e instanceof LensError) {
        return;
      }
      throw e;
    }
    const changesCurrent = lensRecordings.some((recording) => recording.lens.from.some((f) => f === "current"));
    if (!(desc === "undo") && changesCurrent) {
      const current = getPlannerState();
      if (current != null) {
        undoRedoMiddleware(plannerDispatch, current);
      }
    }
  };
  return plannerDispatch;
}
