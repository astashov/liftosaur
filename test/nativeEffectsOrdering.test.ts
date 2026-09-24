import "mocha";
import { expect } from "chai";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Program_nextHistoryRecord } from "../src/models/program";
import { Settings_build } from "../src/models/settings";
import { Stats_getEmpty } from "../src/models/stats";
import { Storage_getDefault } from "../src/models/storage";
import { buildState } from "../src/models/state";
import { IAction, reducerWrapper } from "../src/ducks/reducer";
import { Persistence } from "../src/utils/persistence";
import { IHistoryRecord, IStorage } from "../src/types";
import { NativeEffects_apply } from "../src/models/nativeEffects";
import { MockBridges_build } from "./utils/mockBridges";

(globalThis as unknown as { __HOST__: string }).__HOST__ = "https://www.liftosaur.com";

function buildProgress(text: string): IHistoryRecord {
  const { program } = PlannerTestUtils_get(text);
  return Program_nextHistoryRecord(program, Settings_build(), Stats_getEmpty(), 0);
}

function buildStore(text: string): {
  state: ReturnType<typeof buildState>;
  reduce: (action: IAction) => void;
  observe: (observer: (dispatch: (action: IAction) => void, action: IAction) => void) => void;
  bridges: ReturnType<typeof MockBridges_build>;
  order: string[];
} {
  const { program } = PlannerTestUtils_get(text);
  const progress = buildProgress(text);
  const storage: IStorage = {
    ...Storage_getDefault(),
    programs: [program],
    currentProgramId: program.id,
    subscription: { apple: [], google: [], key: "test-key" },
    progress: [progress],
  };
  const state = buildState({ storage, deviceId: "test-device" });
  const bridges = MockBridges_build();
  const order: string[] = [];
  const reducer = reducerWrapper(false, new Persistence(), (effects) => {
    order.push("effects");
    NativeEffects_apply(bridges, effects);
  });
  let current = state;
  const observers: ((dispatch: (action: IAction) => void, action: IAction) => void)[] = [];
  const dispatch = (action: IAction): void => {
    current = reducer(current, action);
    order.push("reduced");
    for (const observer of observers) {
      observer(dispatch, action);
    }
  };
  return {
    state: current,
    bridges,
    order,
    observe: (observer) => observers.push(observer),
    reduce: dispatch,
  };
}

describe("Native effect ordering", () => {
  it("runs the effects before the reducer returns, so an observer's nested dispatch cannot overtake them", () => {
    const store = buildStore(`# Week 1\n## Day 1\nSquat / 3x5 100lb / 60s\n`);
    store.reduce({
      type: "CompleteSetAction",
      entryIndex: 0,
      setIndex: 0,
      mode: "workout",
      forceUpdateEntryIndex: false,
      isExternal: false,
      isPlayground: false,
    });
    expect(store.order).to.eql(["effects", "reduced"]);
    expect(store.bridges.log.names()).to.contain("timer.startTimer");
  });

  it("deleting a workout discards it on the phone, the watch and the mirrored session, in that order", () => {
    const store = buildStore(`# Week 1\n## Day 1\nSquat / 3x5 100lb / 60s\n`);
    store.reduce({ type: "DeleteProgress", id: 0 });
    expect(store.bridges.log.names()).to.eql([
      "workout.discardWorkout",
      "watch.sendDiscardWorkoutToWatch",
      "mirroring.resetWatchWorkoutState",
    ]);
  });

  it("resuming a paused workout reaches the workout bridge through the reducer", () => {
    const store = buildStore(`# Week 1\n## Day 1\nSquat / 3x5 100lb / 60s\n`);
    store.reduce({
      type: "CompleteSetAction",
      entryIndex: 0,
      setIndex: 0,
      mode: "workout",
      forceUpdateEntryIndex: false,
      isExternal: false,
      isPlayground: false,
    });
    expect(store.bridges.log.names()).to.contain("workout.resumeWorkout");
  });

  it("stopping the rest timer reaches the timer bridge", () => {
    const store = buildStore(`# Week 1\n## Day 1\nSquat / 3x5 100lb / 60s\n`);
    store.reduce({ type: "StopTimer" });
    expect(store.bridges.log.names()).to.eql(["timer.stopTimer"]);
  });

  it("reports the Android scheduled notification on a later microtask, never inside startTimer", async () => {
    const bridges = MockBridges_build();
    let scheduled = false;
    bridges.timer.subscribeOnScheduled(() => {
      scheduled = true;
    });
    bridges.timer.startTimer({
      duration: 60,
      title: "t",
      subtitleHeader: "",
      subtitle: "",
      bodyHeader: "",
      body: "",
      volume: 1,
      vibration: true,
      ignoreDoNotDisturb: false,
      timerSinceMs: Date.now(),
      timerSeconds: 60,
    });
    expect(scheduled).to.equal(false);
    await Promise.resolve();
    expect(scheduled).to.equal(true);
  });

  it("carries the request id on the payload sent while the native handler is still on the stack", () => {
    const bridges = MockBridges_build();
    bridges.workout.subscribeToLiveActivityActions(() => {
      NativeEffects_apply(bridges, [
        { type: "updateLiveActivity", state: { workoutStartTimestamp: 1, ignoreDoNotDisturb: false } },
      ]);
    });
    bridges.workout.emitLiveActivityAction({ action: "completeSet", completeSetRequestId: "req-1" });
    expect(bridges.workout.liveActivityStates.map((s) => s.completeSetRequestId)).to.eql(["req-1"]);
  });

  it("sends no request id on an update that happens after the handler returned", () => {
    const bridges = MockBridges_build();
    bridges.workout.subscribeToLiveActivityActions(() => undefined);
    bridges.workout.emitLiveActivityAction({ action: "completeSet", completeSetRequestId: "req-1" });
    NativeEffects_apply(bridges, [
      { type: "updateLiveActivity", state: { workoutStartTimestamp: 1, ignoreDoNotDisturb: false } },
    ]);
    expect(bridges.workout.liveActivityStates.map((s) => s.completeSetRequestId)).to.eql([undefined]);
  });

  it("clears the request id when the handler throws", () => {
    const bridges = MockBridges_build();
    bridges.workout.subscribeToLiveActivityActions(() => {
      throw new Error("handler failed");
    });
    expect(() =>
      bridges.workout.emitLiveActivityAction({ action: "completeSet", completeSetRequestId: "req-1" })
    ).to.throw("handler failed");
    NativeEffects_apply(bridges, [
      { type: "updateLiveActivity", state: { workoutStartTimestamp: 1, ignoreDoNotDisturb: false } },
    ]);
    expect(bridges.workout.liveActivityStates.map((s) => s.completeSetRequestId)).to.eql([undefined]);
  });

  it("finishes an action's own effects before an observer's nested dispatch sends its own", () => {
    const store = buildStore(`# Week 1\n## Day 1\nSquat / 3x5 100lb / 60s\n`);
    store.observe((dispatch, action) => {
      if (action.type === "CompleteSetAction") {
        dispatch({ type: "StopTimer" });
      }
    });
    store.reduce({
      type: "CompleteSetAction",
      entryIndex: 0,
      setIndex: 0,
      mode: "workout",
      forceUpdateEntryIndex: false,
      isExternal: false,
      isPlayground: false,
    });
    const names = store.bridges.log.names();
    expect(names[names.length - 1]).to.equal("timer.stopTimer");
    expect(names.indexOf("timer.startTimer")).to.be.lessThan(names.lastIndexOf("timer.stopTimer"));
  });
});
