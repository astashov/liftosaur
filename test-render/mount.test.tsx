import { screen } from "@testing-library/react-native";
import { Fixture_build } from "./harness/fixture";
import { IRenderApp, RenderApp_mount } from "./harness/renderApp";
import { IRenderEnv, RenderEnv_build } from "./harness/renderEnv";

describe("the real app mounts headlessly", () => {
  let app: IRenderApp;
  let rendered: IRenderEnv;

  beforeEach(async () => {
    rendered = RenderEnv_build();
    app = await RenderApp_mount(Fixture_build(), rendered.env);
  });

  afterEach(async () => {
    await app.unmount();
  });

  it("lands on the workout screen with its rows and controls", () => {
    expect(rendered.env.getCurrentScreenData?.()?.name).toBe("progress");
    expect(screen.getAllByTestId("complete-set").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("set-nonstarted").length).toBeGreaterThan(0);
  });

  it("mirrors storage to the watch on mount, and makes no other native call", () => {
    expect(Array.from(new Set(rendered.bridges.log.names()))).toEqual(["watch.sendStorageToWatch"]);
  });
});
