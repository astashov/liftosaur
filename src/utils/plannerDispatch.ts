import { ILensRecordingPayload, LensBuilder } from "lens-shmens";
import { IState, updateState } from "../models/state";
import { IDispatch } from "../ducks/types";
import { ILensDispatch } from "./useLensReducer";
import { IUndoRedoState, undoRedoMiddleware } from "../pages/builder/utils/undoredo";
import { Thunk_log } from "../ducks/thunks";

// All program-editor mutations flow through a plannerDispatch with a human-readable `desc`. We map
// those descs to durable ls-program-* logs in one place so the add/remove/reorder controls scattered
// across the UI/reorder editors and the exercise-picker modal don't each need instrumenting.
const EDIT_ACTION_BY_DESC: Record<string, string> = {
  "Add new week": "ls-program-add-week",
  "Delete week": "ls-program-remove-week",
  "Duplicate week": "ls-program-duplicate-week",
  "Reorder weeks": "ls-program-reorder-week",
  "Add new day": "ls-program-add-day",
  "Delete day": "ls-program-remove-day",
  "Clone day": "ls-program-duplicate-day",
  "Duplicate day": "ls-program-duplicate-day",
  "Reorder days": "ls-program-reorder-day",
  "Add exercise to exercise text": "ls-program-add-exercise",
  "Replace one exercise in planner": "ls-program-swap-exercise",
  // "Replace all" changes every instance of an EXISTING exercise (a swap-all), not an add.
  "Replace all exercises in planner": "ls-program-swap-all-exercises",
  "Duplicate exercise in planner": "ls-program-duplicate-exercise",
  "Delete exercise instance": "ls-program-remove-exercise",
  "Reorder exercise": "ls-program-reorder-exercise",
};

// These descs fire on every keystroke, so callers pass a per-session Set to log them at most once.
const EDIT_TEXT_ACTION_BY_DESC: Record<string, string> = {
  "Update full program text": "ls-program-edit-text-full",
  "Update exercise text": "ls-program-edit-text-perday",
};

export function PlannerDispatch_logEditAction(
  dispatch: IDispatch,
  desc: string | undefined,
  loggedOnce: Set<string>
): void {
  if (!desc) {
    return;
  }
  const action = EDIT_ACTION_BY_DESC[desc];
  if (action) {
    dispatch(Thunk_log(action));
  }
  const onceAction = EDIT_TEXT_ACTION_BY_DESC[desc];
  if (onceAction && !loggedOnce.has(onceAction)) {
    loggedOnce.add(onceAction);
    dispatch(Thunk_log(onceAction));
  }
}

export function buildPlannerDispatch<T, S extends IUndoRedoState<T>, O = never>(
  dispatch: IDispatch,
  lensBuilder: LensBuilder<IState, S, {}, O>,
  plannerStateOrGetter: S | (() => S | undefined)
): ILensDispatch<S> {
  const getPlannerState = (): S | undefined =>
    typeof plannerStateOrGetter === "function" ? (plannerStateOrGetter as () => S | undefined)() : plannerStateOrGetter;
  const loggedOnce = new Set<string>();
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
    PlannerDispatch_logEditAction(dispatch, desc, loggedOnce);
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
