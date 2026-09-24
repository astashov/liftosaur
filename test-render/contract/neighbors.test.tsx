import { Fixture_build } from "../harness/fixture";
import { IRenderApp, RenderApp_mount } from "../harness/renderApp";
import { RenderEnv_build } from "../harness/renderEnv";
import { RenderTargets } from "../harness/renderTargets";
import { RenderTrace_byInstance, RenderTrace_format, RenderTrace_select } from "../harness/renderTrace";
import { IState } from "../../src/models/state";

describe("neighbours and other screens", () => {
  let app: IRenderApp;
  let state: IState;

  beforeEach(async () => {
    state = Fixture_build();
    const { env } = RenderEnv_build();
    app = await RenderApp_mount(state, env);
  });

  afterEach(async () => {
    await app.unmount();
  });

  it("mounts more than one exercise page, so a stray render on a neighbour is visible", () => {
    expect(app.mounted({ component: RenderTargets.exercisePage }).length).toBeGreaterThan(1);
  });

  it("mounts rows of more than one entry, which is what makes the quiet contract mean something", () => {
    const entries = app.mounted({ component: RenderTargets.setRow }).map((m) => m.target.entry);
    expect(new Set(entries).size).toBeGreaterThan(1);
  });

  it("leaves every row outside the pressed entry quiet when a set is completed", async () => {
    const trace = await app.record(async () => {
      await app.completeSet(0);
    });
    const neighbours = RenderTrace_select(trace, { component: RenderTargets.setRow }).filter(
      (r) => r.target.entry !== "0"
    );
    expect(RenderTrace_format(neighbours)).toBe("(nothing)");
  });

  it("re-renders the home tab once per completed set, after that tab has been visited", async () => {
    await app.goToHomeTab();
    await app.goToWorkout();

    const trace = await app.record(async () => {
      await app.completeSet(0);
    });
    expect(RenderTrace_byInstance(RenderTrace_select(trace, { component: "ProgramHistoryView" }))).toEqual({
      ProgramHistoryView: 1,
    });
  });
});
