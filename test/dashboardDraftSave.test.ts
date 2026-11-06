import "mocha";
import { expect } from "chai";
import {
  DashboardDraftSave_failed,
  DashboardDraftSave_init,
  DashboardDraftSave_isDirty,
  DashboardDraftSave_isSaving,
  DashboardDraftSave_rename,
  DashboardDraftSave_start,
  DashboardDraftSave_succeeded,
} from "../src/models/dashboardDraftSave";

const oldBase = { vc: { web: 1 }, t: 100 };
const newBase = { vc: { web: 2 }, t: 200 };

describe("DashboardDraftSave", () => {
  it("sends nothing when clean", () => {
    const state = DashboardDraftSave_init({ name: "A", text: "x" }, oldBase);
    expect(DashboardDraftSave_isDirty(state, "x")).to.equal(false);
    expect(DashboardDraftSave_start(state, "x").request).to.equal(undefined);
  });

  it("submits the current text with the saved base, and keeps edits typed during the save unsaved", () => {
    const state = DashboardDraftSave_init({ name: "A", text: "x" }, oldBase);
    expect(DashboardDraftSave_isDirty(state, "y")).to.equal(true);
    const started = DashboardDraftSave_start(state, "y");
    expect(started.request).to.eql({ snapshot: { name: "A", text: "y" }, base: oldBase });
    expect(DashboardDraftSave_isSaving(started.state)).to.equal(true);
    const done = DashboardDraftSave_succeeded(started.state, newBase);
    expect(done.saved).to.eql({ name: "A", text: "y", base: newBase });
    expect(DashboardDraftSave_isSaving(done)).to.equal(false);
    expect(DashboardDraftSave_isDirty(done, "yz")).to.equal(true);
    expect(DashboardDraftSave_isDirty(done, "y")).to.equal(false);
  });

  it("refuses a second save while one is pending", () => {
    const renamed = DashboardDraftSave_rename(DashboardDraftSave_init({ name: "A", text: "x" }), "B");
    const started = DashboardDraftSave_start(renamed, "x");
    expect(started.request?.snapshot).to.eql({ name: "B", text: "x" });
    expect(DashboardDraftSave_start(started.state, "xy").request).to.equal(undefined);
  });

  it("keeps the saved snapshot and base when the save fails", () => {
    const state = DashboardDraftSave_init({ name: "A", text: "x" }, oldBase);
    const failed = DashboardDraftSave_failed(DashboardDraftSave_start(state, "y").state);
    expect(failed.saved).to.eql({ name: "A", text: "x", base: oldBase });
    expect(DashboardDraftSave_isSaving(failed)).to.equal(false);
    expect(DashboardDraftSave_isDirty(failed, "y")).to.equal(true);
  });
});
