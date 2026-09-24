import { Fixture_build, Fixture_history } from "../harness/fixture";
import { RenderApp_mount } from "../harness/renderApp";
import { RenderEnv_build } from "../harness/renderEnv";
import { HomeTargets } from "../harness/renderTargets";
import { RenderTrace_byComponent, RenderTrace_select } from "../harness/renderTrace";
import { IRenderTrace } from "../harness/renderTrace";

async function homeCommits(historyLength: number): Promise<Record<string, number>> {
  const state = Fixture_build();
  const { env } = RenderEnv_build();
  const app = await RenderApp_mount(
    { ...state, storage: { ...state.storage, history: Fixture_history(historyLength) } },
    env
  );
  try {
    await app.goToHomeTab();
    await app.goToWorkout();
    const trace: IRenderTrace = await app.record(async () => {
      await app.completeSet(0);
    });
    const home = HomeTargets.flatMap((component) => RenderTrace_select(trace, { component }));
    return RenderTrace_byComponent(home);
  } finally {
    await app.unmount();
  }
}

describe("the blurred home tab", () => {
  // The home screen shows the ongoing workout, so it commits when a set is completed. The history
  // list must not, however long the history is: it is virtualized and its rows keep their props.
  it("commits the same components whether the history holds one workout or two hundred", async () => {
    expect(await homeCommits(200)).toEqual(await homeCommits(1));
  });

  it("commits each home component once", async () => {
    expect(await homeCommits(200)).toEqual({
      NavScreenMain: 1,
      ProgramHistoryView: 1,
      WeekCalendar: 1,
      WeekInsights: 1,
    });
  });
});
