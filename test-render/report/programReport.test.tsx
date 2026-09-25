import { screen } from "@testing-library/react-native";
import { Fixture_build } from "../harness/fixture";
import { KitchenSinkProgram_build } from "../harness/kitchenSinkProgram";
import { IRenderApp, IRenderAppOpts, RenderApp_mount } from "../harness/renderApp";
import { RenderEnv_build } from "../harness/renderEnv";
import { Program_evaluate } from "../../src/models/program";
import { Settings_build } from "../../src/models/settings";
import {
  IReportOpts,
  ReportFormat_countParses,
  ReportFormat_describe,
  ReportFormat_emit,
  ReportFormat_recording,
} from "./reportFormat";

interface IOperation {
  name: string;
  setup: (app: IRenderApp) => Promise<void>;
  act: (app: IRenderApp) => Promise<void>;
}

async function open(app: IRenderApp): Promise<void> {
  await app.openProgram();
  await app.settleUntilQuiet();
}

async function toTab(app: IRenderApp, tab: "tab-preview" | "tab-edit" | "tab-playground"): Promise<void> {
  await app.press(tab);
  await app.settleUntilQuiet();
}

async function toEditMode(app: IRenderApp, mode: "grid" | "ui" | "perday" | "full"): Promise<void> {
  await toTab(app, "tab-edit");
  await app.press(`editor-v2-${mode}-program`);
  await app.settleUntilQuiet();
}

const OPERATIONS: IOperation[] = [
  {
    name: "preview: switch to week 2",
    setup: open,
    act: (app) => app.press("tab-week-2"),
  },
  {
    name: "rename the program in the header",
    setup: open,
    act: (app) => app.changeText("Kitchen Sink", "Kitchen Sinks"),
  },
  {
    name: "switch Preview -> Edit (grid)",
    setup: open,
    act: (app) => app.press("tab-edit"),
  },
  {
    name: "edit: switch grid -> ui mode",
    setup: async (app) => {
      await open(app);
      await toTab(app, "tab-edit");
    },
    act: (app) => app.press("editor-v2-ui-program"),
  },
  {
    name: "edit ui: switch to week 2",
    setup: async (app) => {
      await open(app);
      await toEditMode(app, "ui");
    },
    act: (app) => app.press("tab-week-2"),
  },
  {
    name: "edit: switch ui -> perday mode",
    setup: async (app) => {
      await open(app);
      await toEditMode(app, "ui");
    },
    act: (app) => app.press("editor-v2-perday-program"),
  },
  {
    name: "edit perday: change 3x8 to 3x9 in day 2",
    setup: async (app) => {
      await open(app);
      await toEditMode(app, "perday");
    },
    act: (app) => app.typeInEditor(1, "3x8 0lb", "3x9 0lb"),
  },
  {
    name: "edit perday: break the syntax in day 2",
    setup: async (app) => {
      await open(app);
      await toEditMode(app, "perday");
    },
    act: (app) => app.typeInEditor(1, "3x8 0lb", "3x 0lb"),
  },
  {
    name: "switch Preview -> Playground",
    setup: open,
    act: (app) => app.press("tab-playground"),
  },
  {
    name: "playground: complete the first set",
    setup: async (app) => {
      await open(app);
      await toTab(app, "tab-playground");
    },
    act: (app) => app.press("complete-set"),
  },
  {
    name: "playground: switch to week 2",
    setup: async (app) => {
      await open(app);
      await toTab(app, "tab-playground");
    },
    act: (app) => app.press("tab-week-2"),
  },
  {
    name: "playground: finish day 1",
    setup: async (app) => {
      await open(app);
      await toTab(app, "tab-playground");
    },
    act: (app) => app.press("finish-day-details-playground"),
  },
];

interface IOpenScenario {
  name: string;
  ongoingWorkout: boolean;
  start: IRenderAppOpts["start"];
  via: "reset" | "navigate";
  setup: (app: IRenderApp) => Promise<void>;
}

const OPEN_SCENARIOS: IOpenScenario[] = [
  {
    name: "open the program screen from home, first time",
    ongoingWorkout: false,
    start: "home",
    via: "reset",
    setup: async () => undefined,
  },
  {
    name: "open the program screen from home, second time, tab switch without reset",
    ongoingWorkout: false,
    start: "home",
    via: "navigate",
    setup: async (app) => {
      await open(app);
      await app.goToHomeTab();
      await app.settleUntilQuiet();
    },
  },
  {
    name: "open the program screen from an ongoing workout, first time",
    ongoingWorkout: true,
    start: "workout",
    via: "navigate",
    setup: async () => undefined,
  },
];

function assertOnProgramScreen(): void {
  if (screen.queryAllByTestId("tab-preview").length !== 1) {
    const ids = screen.container.queryAll((n) => n.props.testID != null).map((n) => String(n.props.testID));
    throw new Error(`Not on the program screen. On screen: ${Array.from(new Set(ids)).join(", ")}`);
  }
}

async function mount(ongoingWorkout: boolean, start: IRenderAppOpts["start"]): Promise<IRenderApp> {
  const program = KitchenSinkProgram_build();
  const { env } = RenderEnv_build();
  return RenderApp_mount(Fixture_build({ program, ongoingWorkout, editingProgram: true }), env, { start });
}

async function report(
  app: IRenderApp,
  name: string,
  act: () => Promise<void>,
  opts: Omit<IReportOpts, "parses"> = {}
): Promise<void> {
  await app.settleUntilQuiet();
  const { result: recording, parses } = await ReportFormat_countParses(() => app.recordUntilQuiet(act));
  assertOnProgramScreen();
  ReportFormat_emit(ReportFormat_recording(name, recording, { ...opts, parses }));
}

ReportFormat_describe("program screen render report", () => {
  it("the kitchen sink program evaluates without errors", () => {
    const evaluated = Program_evaluate(KitchenSinkProgram_build(), Settings_build());
    expect(evaluated.errors).toEqual([]);
    expect(evaluated.weeks.length).toBe(4);
  });

  for (const scenario of OPEN_SCENARIOS) {
    it(scenario.name, async () => {
      const app = await mount(scenario.ongoingWorkout, scenario.start);
      try {
        await scenario.setup(app);
        await report(app, `${scenario.name} (by mounts)`, () => app.openProgram(scenario.via), {
          sortBy: "mounted",
          limit: 150,
        });
      } finally {
        await app.unmount();
      }
    });
  }

  for (const op of OPERATIONS) {
    it(op.name, async () => {
      const app = await mount(false, "home");
      try {
        await op.setup(app);
        await report(app, op.name, () => op.act(app));
      } finally {
        await app.unmount();
      }
    });
  }
});
