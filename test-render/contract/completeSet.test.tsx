import { screen } from "@testing-library/react-native";
import { Fixture_build } from "../harness/fixture";
import { IRenderApp, RenderApp_mount } from "../harness/renderApp";
import { RenderEnv_build } from "../harness/renderEnv";
import { RenderTargets } from "../harness/renderTargets";
import {
  RenderTrace_byInstance,
  RenderTrace_format,
  RenderTrace_remounts,
  RenderTrace_select,
} from "../harness/renderTrace";
import { IState } from "../../src/models/state";

describe("completing one set", () => {
  let app: IRenderApp;
  let state: IState;

  function setId(entryIndex: number, setIndex: number): string {
    return String(state.storage.progress[0].entries[entryIndex].sets[setIndex].id);
  }

  beforeEach(async () => {
    state = Fixture_build();
    const { env } = RenderEnv_build();
    app = await RenderApp_mount(state, env);
  });

  afterEach(async () => {
    await app.unmount();
  });

  it("mounts the rows the other tests here assert on", () => {
    expect(app.mounted({ component: RenderTargets.setRow }).length).toBeGreaterThan(1);
    expect(app.mounted({ component: RenderTargets.numberInput }).length).toBeGreaterThan(0);
    expect(app.mounted({ component: RenderTargets.weightInput }).length).toBeGreaterThan(0);
  });

  it("completes the set it was told to complete", async () => {
    const before = screen.getAllByTestId("set-nonstarted").length;
    await app.completeSet(0);
    expect(screen.getAllByTestId("set-completed")).toHaveLength(1);
    expect(screen.getAllByTestId("set-nonstarted")).toHaveLength(before - 1);
  });

  it("commits the completed row and the row that becomes next, each once, and no other row", async () => {
    const trace = await app.record(async () => {
      await app.completeSet(0);
    });
    expect(RenderTrace_byInstance(RenderTrace_select(trace, { component: RenderTargets.setRow }))).toEqual({
      [`${RenderTargets.setRow}[entry=0, mode=workout, set=${setId(0, 0)}]`]: 1,
      [`${RenderTargets.setRow}[entry=0, mode=workout, set=${setId(0, 1)}]`]: 1,
    });
  });

  it("never remounts a set row", async () => {
    const trace = await app.record(async () => {
      await app.completeSet(0);
    });
    const remounted = RenderTrace_remounts(trace).filter((r) => r.component === RenderTargets.setRow);
    expect(RenderTrace_format(remounted)).toBe("(nothing)");
  });

  it("commits only the inputs of the two rows that changed, each once", async () => {
    const trace = await app.record(async () => {
      await app.completeSet(0);
    });
    const inputs = [
      ...RenderTrace_select(trace, { component: RenderTargets.numberInput }),
      ...RenderTrace_select(trace, { component: RenderTargets.weightInput }),
    ];
    const allowed = [setId(0, 0), setId(0, 1)];
    expect(inputs.filter((r) => r.target.set != null && !allowed.includes(r.target.set))).toEqual([]);
    expect(inputs.map((r) => r.commits)).toEqual(inputs.map(() => 1));
  });

  it("walks one ancestor chain, not the whole app", async () => {
    const trace = await app.record(async () => {
      await app.completeSet(0);
    });
    for (const component of [
      RenderTargets.screen,
      RenderTargets.workout,
      RenderTargets.exerciseCard,
      RenderTargets.exercisePage,
    ]) {
      expect(RenderTrace_select(trace, { component }).map((r) => r.commits)).toEqual([1]);
    }
  });
});
