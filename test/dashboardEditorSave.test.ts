import "mocha";
import { expect } from "chai";
import {
  DashboardEditorSave_confirmAsNew,
  DashboardEditorSave_decide,
  DashboardEditorSave_upsert,
  IDashboardEditorSession,
} from "../src/models/dashboardEditorSave";
import { Dashboard_maxCount, Dashboard_maxTextBytes } from "../src/models/dashboard";
import { IDashboard } from "../src/types";

function dashboard(id: string, text: string = "old"): IDashboard {
  return { vtype: "dashboard", id, name: id, text };
}

describe("DashboardEditorSave", () => {
  const session: IDashboardEditorSession = { dashboardId: "b", baseText: "old", origin: "persisted" };

  it("closes when nothing changed", () => {
    expect(DashboardEditorSave_decide({ dashboards: [dashboard("b")] }, session, "old")).to.eql({ kind: "close" });
  });

  it("writes into the opened dashboard and keeps the current one", () => {
    const storage = { dashboards: [dashboard("a"), dashboard("b")], currentDashboardId: "a" };
    expect(DashboardEditorSave_decide(storage, session, "new")).to.eql({
      kind: "write",
      dashboard: dashboard("b", "new"),
      currentDashboardId: undefined,
    });
  });

  it("asks before saving a deleted dashboard as a new one, also when it was the last one", () => {
    expect(DashboardEditorSave_decide({ dashboards: [dashboard("a")] }, session, "new").kind).to.equal("askSaveAsNew");
    expect(DashboardEditorSave_decide({ dashboards: [] }, session, "new").kind).to.equal("askSaveAsNew");
    const graphs = { ...session, dashboardId: "graphs" };
    expect(DashboardEditorSave_decide({ dashboards: [] }, graphs, "new").kind).to.equal("askSaveAsNew");
  });

  it("creates the seed dashboard for an account that showed the old graphs", () => {
    const fallback: IDashboardEditorSession = { dashboardId: "graphs", baseText: "", origin: "fallback" };
    expect(DashboardEditorSave_decide({}, fallback, "graph {\n}")).to.eql({
      kind: "write",
      dashboard: { vtype: "dashboard", id: "graphs", name: "Graphs", text: "graph {\n}" },
      currentDashboardId: "graphs",
    });
  });

  it("refuses text over the size limit", () => {
    const decision = DashboardEditorSave_decide(
      { dashboards: [dashboard("b")] },
      session,
      "x".repeat(Dashboard_maxTextBytes + 1)
    );
    expect(decision.kind).to.equal("alert");
  });

  it("saves as new against the latest dashboards, and refuses past the count limit", () => {
    expect(DashboardEditorSave_confirmAsNew({ dashboards: [dashboard("a")] }, "new", "fresh")).to.eql({
      kind: "write",
      dashboard: { vtype: "dashboard", id: "fresh", name: "Graphs", text: "new" },
      currentDashboardId: "fresh",
    });
    const full = Array.from({ length: Dashboard_maxCount }, (_, i) => dashboard(`d${i}`));
    expect(DashboardEditorSave_confirmAsNew({ dashboards: full }, "new", "fresh").kind).to.equal("alert");
  });

  it("upserts by id and keeps the other dashboards", () => {
    expect(DashboardEditorSave_upsert([dashboard("a"), dashboard("b")], dashboard("b", "new"))).to.eql([
      dashboard("a"),
      dashboard("b", "new"),
    ]);
    expect(DashboardEditorSave_upsert(undefined, dashboard("a"))).to.eql([dashboard("a")]);
  });
});
