import "mocha";
import { expect } from "chai";
import {
  FieldRevision_dashboardText,
  FieldRevision_isStale,
  FieldRevision_programPlanner,
} from "../src/utils/fieldRevision";

describe("FieldRevision_isStale", () => {
  it("is stale only when the stored clock is newer than or concurrent with the base", () => {
    const base = { vc: { web: 1 }, t: 100 };
    expect(FieldRevision_isStale({ vc: { web: 1, phone: 1 }, t: 200 }, base)).to.equal(true);
    expect(FieldRevision_isStale({ vc: { phone: 1 }, t: 200 }, base)).to.equal(true);
    expect(FieldRevision_isStale({ vc: { web: 1 }, t: 100 }, base)).to.equal(false);
    expect(FieldRevision_isStale({ vc: { web: 1 }, t: 100 }, { vc: { web: 2 }, t: 150 })).to.equal(false);
  });

  it("skips the check without a base or a stored clock", () => {
    expect(FieldRevision_isStale({ vc: { phone: 1 }, t: 200 }, undefined)).to.equal(false);
    expect(FieldRevision_isStale(undefined, { vc: { web: 1 }, t: 100 })).to.equal(false);
  });
});

describe("FieldRevision_programPlanner", () => {
  it("reads the planner clock of the program keyed by clonedAt", () => {
    const planner = { vc: { phone: 3 }, t: 300 };
    const versions = { programs: { items: { 1234: { name: 100, planner } }, deleted: {} } };
    expect(FieldRevision_programPlanner(versions, 1234)).to.deep.equal(planner);
    expect(FieldRevision_programPlanner(versions, 9999)).to.equal(undefined);
    expect(FieldRevision_programPlanner(versions, undefined)).to.equal(undefined);
    expect(FieldRevision_programPlanner(undefined, 1234)).to.equal(undefined);
  });
});

describe("FieldRevision_dashboardText", () => {
  it("reads the text clock of the dashboard keyed by id", () => {
    const text = { vc: { phone: 2 }, t: 200 };
    const versions = { dashboards: { items: { abc: { name: 100, text } }, deleted: {} } };
    expect(FieldRevision_dashboardText(versions, "abc")).to.deep.equal(text);
    expect(FieldRevision_dashboardText(versions, "zzz")).to.equal(undefined);
    expect(FieldRevision_dashboardText(undefined, "abc")).to.equal(undefined);
  });
});
