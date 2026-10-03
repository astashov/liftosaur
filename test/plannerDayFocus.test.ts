import "mocha";
import { expect } from "chai";
import {
  PlannerDayFocus_collapseKey,
  PlannerDayFocus_isNew,
  PlannerDayFocus_toggleCollapsed,
} from "../src/pages/planner/models/plannerDayFocus";

describe("PlannerDayFocus", () => {
  it("uses the key format the app's day cards use", () => {
    expect(PlannerDayFocus_collapseKey(1, 2)).to.equal("1-2");
  });

  it("collapses an expanded day and expands a collapsed one, without touching the input set", () => {
    const collapsed = new Set(["0-0"]);
    const afterCollapse = PlannerDayFocus_toggleCollapsed(collapsed, "0-1");
    expect([...afterCollapse].sort()).to.deep.equal(["0-0", "0-1"]);
    const afterExpand = PlannerDayFocus_toggleCollapsed(afterCollapse, "0-0");
    expect([...afterExpand]).to.deep.equal(["0-1"]);
    expect([...collapsed]).to.deep.equal(["0-0"]);
  });

  it("treats the same week, day and line as no change, so cursor moves on one line do not dispatch", () => {
    const focus = { weekIndex: 0, dayIndex: 1, exerciseLine: 3 };
    expect(PlannerDayFocus_isNew(focus, { ...focus })).to.equal(false);
    expect(PlannerDayFocus_isNew(focus, { ...focus, exerciseLine: 4 })).to.equal(true);
    expect(PlannerDayFocus_isNew(focus, { ...focus, dayIndex: 0 })).to.equal(true);
    expect(PlannerDayFocus_isNew(undefined, focus)).to.equal(true);
  });
});
