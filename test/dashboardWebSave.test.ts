import "mocha";
import { expect } from "chai";
import {
  DashboardWebSave_create,
  DashboardWebSave_delete,
  DashboardWebSave_isDirty,
  DashboardWebSave_rowWrites,
  DashboardWebSave_select,
  DashboardWebSave_update,
  IDashboardWebStorage,
} from "../src/models/dashboardWebSave";
import { Dashboard_maxTextBytes } from "../src/models/dashboard";
import { IDashboard } from "../src/types";

function dashboard(id: string, text: string = "old"): IDashboard {
  return { vtype: "dashboard", id, name: id, text };
}

const textClock = { vc: { phone: 2 }, t: 200 };
const storage: IDashboardWebStorage = {
  dashboards: [dashboard("a"), dashboard("b")],
  currentDashboardId: "a",
  _versions: { dashboards: { items: { b: { name: 100, text: textClock } }, deleted: { gone: 50 } } },
};

describe("DashboardWebSave", () => {
  it("creates a dashboard, and refuses a bad shape or a taken id", () => {
    expect(DashboardWebSave_create(storage, { dashboard: dashboard("c") })).to.eql({
      kind: "write",
      dashboards: [dashboard("a"), dashboard("b"), dashboard("c")],
      currentDashboardId: "a",
    });
    expect(DashboardWebSave_create(storage, { dashboard: { id: "c", name: "c", text: "" } })).to.deep.include({
      status: 400,
    });
    expect(DashboardWebSave_create(storage, { dashboard: dashboard("b") })).to.deep.include({ status: 409 });
    expect(DashboardWebSave_create(storage, { dashboard: dashboard("gone") })).to.deep.include({ status: 409 });
  });

  it("updates name and text when the base matches the stored text clock", () => {
    const result = DashboardWebSave_update(storage, "b", { dashboard: { name: "B", text: "new" }, base: textClock });
    expect(result).to.eql({
      kind: "write",
      dashboards: [dashboard("a"), { vtype: "dashboard", id: "b", name: "B", text: "new" }],
      currentDashboardId: "a",
    });
  });

  it("refuses an update from a stale base, a deleted dashboard, or text over the size limit", () => {
    const stale = { vc: { phone: 1 }, t: 100 };
    expect(DashboardWebSave_update(storage, "b", { dashboard: { name: "b", text: "x" }, base: stale })).to.deep.include(
      { status: 409 }
    );
    expect(DashboardWebSave_update(storage, "gone", { dashboard: { name: "g", text: "x" } })).to.deep.include({
      status: 409,
    });
    expect(DashboardWebSave_update(storage, "nope", { dashboard: { name: "n", text: "x" } })).to.deep.include({
      status: 404,
    });
    const huge = "x".repeat(Dashboard_maxTextBytes + 1);
    expect(DashboardWebSave_update(storage, "a", { dashboard: { name: "a", text: huge } })).to.deep.include({
      status: 400,
    });
  });

  it("selects only an existing dashboard", () => {
    expect(DashboardWebSave_select(storage, "b")).to.deep.include({ kind: "write", currentDashboardId: "b" });
    expect(DashboardWebSave_select(storage, "nope")).to.deep.include({ status: 404 });
  });

  it("moves current to the first one left when the current one is deleted, and refuses the last one", () => {
    expect(DashboardWebSave_delete(storage, "a")).to.eql({
      kind: "write",
      dashboards: [dashboard("b")],
      currentDashboardId: "b",
    });
    expect(DashboardWebSave_delete(storage, "b")).to.deep.include({ currentDashboardId: "a" });
    expect(DashboardWebSave_delete({ dashboards: [dashboard("a")] }, "a")).to.deep.include({ status: 400 });
  });

  it("writes only new or changed rows, and deletes removed ones", () => {
    const old = [dashboard("a"), dashboard("b")];
    expect(DashboardWebSave_rowWrites(old, [dashboard("a"), dashboard("b", "new"), dashboard("c")])).to.eql({
      toPut: [dashboard("b", "new"), dashboard("c")],
      idsToDelete: [],
    });
    expect(DashboardWebSave_rowWrites(old, [dashboard("b")])).to.eql({ toPut: [], idsToDelete: ["a"] });
  });

  it("is dirty when the name or the text differs from the saved snapshot", () => {
    expect(DashboardWebSave_isDirty({ name: "a", text: "t" }, { name: "a", text: "t" })).to.equal(false);
    expect(DashboardWebSave_isDirty({ name: "a", text: "t" }, { name: "b", text: "t" })).to.equal(true);
    expect(DashboardWebSave_isDirty({ name: "a", text: "t" }, { name: "a", text: "u" })).to.equal(true);
  });
});
