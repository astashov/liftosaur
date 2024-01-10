import { lb } from "lens-shmens";
import { IPlannerState } from "../../pages/planner/models/types";
import { ILensDispatch } from "../../utils/useLensReducer";

export function applyChangesInEditor(plannerDispatch: ILensDispatch<IPlannerState>, cb: () => void): void {
  window.isUndoing = true;
  cb();
  plannerDispatch(
    [
      lb<IPlannerState>()
        .p("ui")
        .recordModify((a) => a),
    ],
    "stop-is-undoing"
  );
}
