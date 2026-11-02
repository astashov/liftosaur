import "mocha";
import { expect } from "chai";
import {
  DashboardDraftSave_edit,
  DashboardDraftSave_failed,
  DashboardDraftSave_init,
  DashboardDraftSave_isDirty,
  DashboardDraftSave_isSaving,
  DashboardDraftSave_start,
  DashboardDraftSave_succeeded,
} from "../src/models/dashboardDraftSave";

const oldBase = { vc: { web: 1 }, t: 100 };
const newBase = { vc: { web: 2 }, t: 200 };

describe("DashboardDraftSave", () => {
  it("sends nothing when clean", () => {
    const state = DashboardDraftSave_init({ name: "A", text: "x" }, oldBase);
    expect(DashboardDraftSave_isDirty(state)).to.equal(false);
    expect(DashboardDraftSave_start(state).request).to.equal(undefined);
  });

  it("submits the draft with the saved base, and keeps edits typed during the save unsaved", () => {
    const edited = DashboardDraftSave_edit(DashboardDraftSave_init({ name: "A", text: "x" }, oldBase), { text: "y" });
    const started = DashboardDraftSave_start(edited);
    expect(started.request).to.eql({ snapshot: { name: "A", text: "y" }, base: oldBase });
    expect(DashboardDraftSave_isSaving(started.state)).to.equal(true);
    const typed = DashboardDraftSave_edit(started.state, { text: "yz" });
    const done = DashboardDraftSave_succeeded(typed, newBase);
    expect(done.saved).to.eql({ name: "A", text: "y", base: newBase });
    expect(DashboardDraftSave_isSaving(done)).to.equal(false);
    expect(DashboardDraftSave_isDirty(done)).to.equal(true);
  });

  it("refuses a second save while one is pending", () => {
    const edited = DashboardDraftSave_edit(DashboardDraftSave_init({ name: "A", text: "x" }), { name: "B" });
    const started = DashboardDraftSave_start(edited);
    expect(DashboardDraftSave_start(started.state).request).to.equal(undefined);
  });

  it("keeps the saved snapshot and base when the save fails", () => {
    const edited = DashboardDraftSave_edit(DashboardDraftSave_init({ name: "A", text: "x" }, oldBase), { text: "y" });
    const failed = DashboardDraftSave_failed(DashboardDraftSave_start(edited).state);
    expect(failed.saved).to.eql({ name: "A", text: "x", base: oldBase });
    expect(failed.draft).to.eql({ name: "A", text: "y" });
    expect(DashboardDraftSave_isSaving(failed)).to.equal(false);
  });
});
