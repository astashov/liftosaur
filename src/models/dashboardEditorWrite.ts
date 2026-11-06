import { lb } from "lens-shmens";
import { IState, updateState } from "./state";
import { IDispatch } from "../ducks/types";
import { DashboardEditorSave_upsert, IDashboardEditorSaveDecision } from "./dashboardEditorSave";

export function DashboardEditorWrite_apply(dispatch: IDispatch, decision: IDashboardEditorSaveDecision): void {
  if (decision.kind !== "write") {
    return;
  }
  const updates = [
    lb<IState>()
      .p("storage")
      .p("dashboards")
      .recordModify((dashboards) => DashboardEditorSave_upsert(dashboards, decision.dashboard)),
  ];
  if (decision.currentDashboardId != null) {
    updates.push(lb<IState>().p("storage").p("currentDashboardId").record(decision.currentDashboardId));
  }
  updateState(dispatch, updates, "Save dashboard text");
}
