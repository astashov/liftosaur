import "mocha";
import { expect } from "chai";
import {
  IWorkoutSetRowTransition,
  IWorkoutSetRowTransitionEvent,
  WorkoutSetRowTransition_initial,
  WorkoutSetRowTransition_step,
} from "../src/utils/workoutSetRowTransition";

function run(
  state: IWorkoutSetRowTransition,
  events: IWorkoutSetRowTransitionEvent[]
): { state: IWorkoutSetRowTransition; effects: string[] } {
  const effects: string[] = [];
  let current = state;
  for (const event of events) {
    const step = WorkoutSetRowTransition_step(current, event);
    current = step.state;
    effects.push(...step.effects.map((e) => JSON.stringify(e)));
  }
  return { state: current, effects };
}

describe("WorkoutSetRowTransition", () => {
  it("on native mounts the leaving copy first, swaps on the next commit, resizes, then settles", () => {
    const s0 = WorkoutSetRowTransition_initial(false, true);
    const s1 = WorkoutSetRowTransition_step(s0, { kind: "target", expanded: true, currentHeight: 48 });
    expect(s1.effects).to.eql([{ kind: "hold", height: 48 }]);
    expect(s1.state.phase).to.eql("leaving");
    expect(s1.state.shownExpanded).to.eql(false);
    expect(s1.state.leavingExpanded).to.eql(false);
    const s2 = WorkoutSetRowTransition_step(s1.state, { kind: "overlayMounted" });
    expect(s2.effects).to.eql([{ kind: "swap" }]);
    expect(s2.state.phase).to.eql("swapped");
    expect(s2.state.shownExpanded).to.eql(true);
    const s3 = WorkoutSetRowTransition_step(s2.state, { kind: "measured", height: 140 });
    expect(s3.effects).to.eql([{ kind: "resize", from: 48, to: 140 }]);
    expect(s3.state.phase).to.eql("resizing");
    const s4 = WorkoutSetRowTransition_step(s3.state, { kind: "finished", height: 140 });
    expect(s4.effects).to.eql([{ kind: "settle", height: 140 }]);
    expect(s4.state.phase).to.eql("idle");
    expect(s4.state.leavingExpanded).to.eql(undefined);
  });

  it("on web swaps in the first commit with no leaving copy", () => {
    const s0 = WorkoutSetRowTransition_initial(false, false);
    const s1 = WorkoutSetRowTransition_step(s0, { kind: "target", expanded: true, currentHeight: 48 });
    expect(s1.effects).to.eql([{ kind: "hold", height: 48 }, { kind: "swap" }]);
    expect(s1.state.phase).to.eql("swapped");
    expect(s1.state.shownExpanded).to.eql(true);
    expect(s1.state.leavingExpanded).to.eql(undefined);
  });

  it("follows layout at rest and ignores a second layout while resizing", () => {
    const idle = WorkoutSetRowTransition_initial(true, true);
    expect(WorkoutSetRowTransition_step(idle, { kind: "measured", height: 140 }).effects).to.eql([
      { kind: "follow", height: 140 },
    ]);
    expect(WorkoutSetRowTransition_step(idle, { kind: "target", expanded: true, currentHeight: 100 }).effects).to.eql(
      []
    );
    expect(WorkoutSetRowTransition_step(idle, { kind: "overlayMounted" }).effects).to.eql([]);
    expect(WorkoutSetRowTransition_step(idle, { kind: "finished", height: 1 }).effects).to.eql([]);
    const resizing = run(WorkoutSetRowTransition_initial(false, true), [
      { kind: "target", expanded: true, currentHeight: 48 },
      { kind: "overlayMounted" },
      { kind: "measured", height: 140 },
    ]);
    expect(WorkoutSetRowTransition_step(resizing.state, { kind: "measured", height: 150 }).effects).to.eql([]);
  });

  it("ignores a layout event that arrives before the swap", () => {
    const leaving = WorkoutSetRowTransition_step(WorkoutSetRowTransition_initial(false, true), {
      kind: "target",
      expanded: true,
      currentHeight: 48,
    });
    expect(WorkoutSetRowTransition_step(leaving.state, { kind: "measured", height: 48 }).effects).to.eql([]);
  });

  it("restarts a flip queued mid-transition from the height just reached", () => {
    const mid = run(WorkoutSetRowTransition_initial(false, true), [
      { kind: "target", expanded: true, currentHeight: 48 },
      { kind: "overlayMounted" },
      { kind: "measured", height: 140 },
      { kind: "target", expanded: false, currentHeight: 90 },
    ]);
    expect(mid.state.targetExpanded).to.eql(false);
    expect(mid.state.shownExpanded).to.eql(true);
    const again = WorkoutSetRowTransition_step(mid.state, { kind: "finished", height: 140 });
    expect(again.effects).to.eql([{ kind: "hold", height: 140 }]);
    expect(again.state.phase).to.eql("leaving");
    expect(again.state.shownExpanded).to.eql(true);
    expect(again.state.leavingExpanded).to.eql(true);
    expect(again.state.targetExpanded).to.eql(false);
  });
});
