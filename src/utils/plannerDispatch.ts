import { ILensRecordingPayload, LensBuilder } from "lens-shmens";
import { IState, updateState } from "../models/state";
import { IDispatch } from "../ducks/types";
import { ILensDispatch } from "./useLensReducer";
import { IUndoRedoState, undoRedoMiddleware } from "../pages/builder/utils/undoredo";

export function buildPlannerDispatch<T, S extends IUndoRedoState<T>>(
  dispatch: IDispatch,
  lensBuilder: LensBuilder<IState, S, {}>,
  plannerState: S
): ILensDispatch<S> {
  const plannerDispatch = (
    lensRecording: ILensRecordingPayload<S> | ILensRecordingPayload<S>[],
    desc: string
  ): void => {
    const lensRecordings = Array.isArray(lensRecording) ? lensRecording : [lensRecording];
    updateState(
      dispatch,
      lensRecordings.map((recording) => recording.prepend(lensBuilder)),
      desc || "Update state"
    );
    const changesCurrent = lensRecordings.some((recording) => recording.lens.from.some((f) => f === "current"));
    if (!(desc === "undo") && changesCurrent && plannerState != null) {
      undoRedoMiddleware(plannerDispatch, plannerState);
    }
  };
  return plannerDispatch;
}
