import "mocha";
import { expect } from "chai";
import {
  DragPress_idle,
  DragPress_takesResponderOnMove,
  DragPress_transition,
  DragPress_yieldsResponder,
  IDragPressEvent,
  IDragPressResult,
  IDragPressState,
} from "../src/models/dragPress";

function run(events: IDragPressEvent[]): IDragPressResult {
  let state: IDragPressState = DragPress_idle;
  let last: IDragPressResult = { state, effects: [] };
  for (const event of events) {
    last = DragPress_transition(state, event);
    state = last.state;
  }
  return last;
}

const touchDown: IDragPressEvent = { type: "pointerDown", at: { x: 10, y: 10 }, isMouse: false };
const mouseDown: IDragPressEvent = { type: "pointerDown", at: { x: 10, y: 10 }, isMouse: true };
const grant: IDragPressEvent = { type: "grant", at: { x: 10, y: 10 } };

describe("DragPress_transition", () => {
  it("starts a touch drag only after the long press", () => {
    expect(run([touchDown, grant]).effects).to.eql([{ type: "startTimer" }]);
    const started = run([touchDown, grant, { type: "longPress" }]);
    expect(started.state.kind).to.equal("dragging");
    expect(started.effects).to.eql([
      { type: "cursor", value: "grabbing" },
      { type: "dragStart", at: { x: 10, y: 10 } },
    ]);
  });

  it("treats touch movement past the slop as a scroll and cancels the long press", () => {
    expect(run([touchDown, grant, { type: "move", at: { x: 10, y: 18 } }]).effects).to.eql([]);
    expect(run([touchDown, grant, { type: "move", at: { x: 10, y: 19 } }]).effects).to.eql([{ type: "cancelTimer" }]);
  });

  it("starts a mouse drag after 4px of movement, with no wait", () => {
    expect(run([mouseDown, grant, { type: "move", at: { x: 14, y: 10 } }]).effects).to.eql([]);
    const moved = run([mouseDown, grant, { type: "move", at: { x: 15, y: 10 } }]);
    expect(moved.state.kind).to.equal("dragging");
    expect(moved.effects.map((e) => e.type)).to.eql(["cursor", "dragStart", "dragMove"]);
    expect(moved.effects[2]).to.eql({ type: "dragMove", translation: { x: 5, y: 0 }, at: { x: 15, y: 10 } });
  });

  it("ends a drag once, and taps when released without dragging", () => {
    const dragging = [touchDown, grant, { type: "longPress" } as const];
    expect(run([...dragging, { type: "release", commit: true }]).effects).to.eql([
      { type: "cancelTimer" },
      { type: "cursor", value: "" },
      { type: "dragEnd", commit: true },
    ]);
    expect(run([...dragging, { type: "release", commit: true }, { type: "release", commit: true }]).effects).to.eql([
      { type: "cancelTimer" },
    ]);
    expect(run([touchDown, grant, { type: "release", commit: true }]).effects).to.eql([
      { type: "cancelTimer" },
      { type: "tap" },
    ]);
    expect(run([touchDown, grant, { type: "release", commit: false }]).effects).to.eql([{ type: "cancelTimer" }]);
  });

  it("clears the timer on unmount, and the cursor too when a drag was running", () => {
    expect(run([touchDown, grant, { type: "unmount" }]).effects).to.eql([{ type: "cancelTimer" }]);
    expect(run([touchDown, grant, { type: "longPress" }, { type: "unmount" }]).effects).to.eql([
      { type: "cancelTimer" },
      { type: "cursor", value: "" },
    ]);
  });

  it("ignores a long press that lands after the finger moved away or lifted", () => {
    expect(run([touchDown, grant, { type: "release", commit: true }, { type: "longPress" }]).effects).to.eql([]);
  });
});

describe("DragPress responder rules", () => {
  it("takes the responder on move only while dragging or for a mouse past 4px", () => {
    const pressed = run([mouseDown]).state;
    expect(DragPress_takesResponderOnMove(pressed, { x: 12, y: 10 })).to.equal(false);
    expect(DragPress_takesResponderOnMove(pressed, { x: 15, y: 10 })).to.equal(true);
    expect(DragPress_takesResponderOnMove(run([touchDown]).state, { x: 50, y: 50 })).to.equal(false);
  });

  it("lets a touch press yield to a scroll, and keeps a mouse press and any drag", () => {
    expect(DragPress_yieldsResponder(run([touchDown]).state)).to.equal(true);
    expect(DragPress_yieldsResponder(run([mouseDown]).state)).to.equal(false);
    expect(DragPress_yieldsResponder(run([touchDown, grant, { type: "longPress" }]).state)).to.equal(false);
  });
});
