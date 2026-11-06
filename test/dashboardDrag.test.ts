import "mocha";
import { expect } from "chai";
import { LiftographDocument_parse } from "../src/liftograph/liftographDocument";
import { LiftographLayout_build } from "../src/liftograph/liftographLayout";
import { DashboardEdit_reservations, DashboardEdit_rows, IDashboardEditRow } from "../src/models/dashboardEdit";
import { IDashboardDropCell } from "../src/models/dashboardDrop";
import {
  DashboardDrag_transition,
  IDashboardDragEvent,
  IDashboardDragResult,
  IDashboardDragState,
} from "../src/models/dashboardDrag";

const text = "value / source: workout\n\nvalue / source: workout";

function rowsOf(source: string): IDashboardEditRow[] {
  return DashboardEdit_rows(
    LiftographLayout_build(LiftographDocument_parse(source)),
    DashboardEdit_reservations(source)
  );
}

const rows = rowsOf(text);
const cells: IDashboardDropCell[] = [
  { rowKey: "r0", cellIndex: 0, x: 0, y: 20, width: 200, height: 60 },
  { rowKey: "r1", cellIndex: 0, x: 0, y: 120, width: 200, height: 60 },
];
const measure = { origin: { x: 10, y: 100 }, cells, scrollAtMeasure: 0 };

function run(events: IDashboardDragEvent[], scrollY: number = 0): IDashboardDragResult {
  let state: IDashboardDragState | undefined;
  let last: IDashboardDragResult = { state, effects: [] };
  for (const event of events) {
    last = DashboardDrag_transition(state, event, { rows, scrollY });
    state = last.state;
  }
  return last;
}

const start: IDashboardDragEvent = { type: "start", slotId: 0, at: { x: 110, y: 150 }, text, token: 1 };
const measured: IDashboardDragEvent = { type: "measured", token: 1, measure };
const overSecond: IDashboardDragEvent = { type: "move", at: { x: 110, y: 250 }, translation: { x: 0, y: 100 } };

describe("DashboardDrag_transition", () => {
  it("asks for a measure on start and presents nothing before it arrives", () => {
    expect(run([start]).effects).to.eql([
      { type: "scrollBegin", y: 150 },
      { type: "measure", token: 1 },
    ]);
    const moved = run([start, overSecond]);
    expect(moved.effects.map((e) => e.type)).to.eql(["scrollMove"]);
    expect(moved.state?.at).to.eql({ x: 110, y: 250 });
  });

  it("shows the ghost from the measured cell and resolves the drop on move", () => {
    const afterMeasure = run([start, measured]);
    expect(afterMeasure.effects[0]).to.eql({ type: "showGhost", width: 200, grab: { x: 0.5, y: 0.5 } });
    const moved = run([start, measured, overSecond]);
    expect(moved.state?.drop).to.eql({ kind: "swap", slotId: 1, spot: { rowKey: "r1", cellIndex: 0 } });
    expect(moved.effects[1]).to.eql({
      type: "present",
      point: { x: 100, y: 150 },
      hoverKey: "r1:0",
      isRejected: false,
    });
  });

  it("ignores a measure that arrives for an older drag", () => {
    const stale = run([start, { ...start, token: 2 }, measured]);
    expect(stale.effects).to.eql([]);
    expect(stale.state?.measure).to.equal(undefined);
  });

  it("adds the scroll since the measure when it resolves", () => {
    const scrolled = run([start, measured, { type: "move", at: { x: 110, y: 150 }, translation: { x: 0, y: 0 } }], 100);
    expect(scrolled.state?.drop).to.eql({ kind: "swap", slotId: 1, spot: { rowKey: "r1", cellIndex: 0 } });
  });

  it("commits the drop once on release and ignores a second end", () => {
    const ended = run([start, measured, overSecond, { type: "end", commit: true }]);
    expect(ended.state).to.equal(undefined);
    expect(ended.effects).to.eql([
      { type: "scrollEnd" },
      { type: "clear" },
      { type: "commit", slotId: 0, drop: { kind: "swap", slotId: 1, spot: { rowKey: "r1", cellIndex: 0 } } },
    ]);
    expect(
      run([start, measured, overSecond, { type: "end", commit: true }, { type: "end", commit: true }]).effects
    ).to.eql([]);
  });

  it("does not commit a cancelled drag or one released before the measure", () => {
    expect(run([start, measured, overSecond, { type: "end", commit: false }]).effects.map((e) => e.type)).to.eql([
      "scrollEnd",
      "clear",
    ]);
    expect(run([start, overSecond, { type: "end", commit: true }]).effects.map((e) => e.type)).to.eql([
      "scrollEnd",
      "clear",
    ]);
  });

  it("cancels the drag when the text changes under it, and keeps it when the text is the same", () => {
    const changed = run([start, measured, overSecond, { type: "textChanged", text: "value / source: workout" }]);
    expect(changed.state).to.equal(undefined);
    expect(changed.effects.map((e) => e.type)).to.eql(["scrollEnd", "clear"]);
    expect(run([start, measured, { type: "textChanged", text }]).state?.slotId).to.equal(0);
  });
});
