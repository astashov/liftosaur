import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { IProgram } from "../src/types";
import { Program_cloneProgram } from "../src/models/program";
import { Progress_getProgress } from "../src/models/progress";
import {
  SyncTestUtils_initTheApp,
  SyncTestUtils_startWorkout,
  SyncTestUtils_finishWorkout,
  SyncTestUtils_completeCurrentProgramRepsActions,
  SyncTestUtils_mockDispatch,
} from "./utils/syncTestUtils";

const programWithDescription: IProgram = {
  vtype: "program",
  weeks: [],
  author: "test",
  clonedAt: 1708563096401,
  description: "Test program",
  shortDescription: "Test",
  url: "",
  tags: [],
  exercises: [],
  name: "Test Program",
  days: [],
  id: "testProgram",
  planner: {
    vtype: "planner",
    name: "Test Program",
    weeks: [
      {
        name: "Week 1",
        days: [
          {
            name: "Day 1",
            exerciseText: "// Squat **deep**\nSquat / 2x5, 1x5+ / 100lb / progress: lp(5lb, 1, 0, 10%, 1, 0)",
          },
        ],
      },
    ],
  },
  nextDay: 1,
  isMultiweek: false,
};

describe("history snapshot on finish", () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    // @ts-ignore
    global.__API_HOST__ = "https://www.liftosaur.com";
    // @ts-ignore
    global.__HOST__ = "https://www.liftosaur.com";
    // @ts-ignore
    global.__ENV__ = "prod";
    // @ts-ignore
    global.__FULL_COMMIT_HASH__ = "abc123";
    // @ts-ignore
    global.__COMMIT_HASH__ = "abc123";
    // @ts-ignore
    global.Rollbar = { configure: () => undefined };
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("persists description and progress state changes into the finished history entry", async () => {
    const { mockReducer } = await SyncTestUtils_initTheApp("web_123");
    await mockReducer.run([
      SyncTestUtils_mockDispatch((ds) =>
        Program_cloneProgram(ds, programWithDescription, mockReducer.state.storage.settings)
      ),
    ]);

    await SyncTestUtils_startWorkout(mockReducer);
    await mockReducer.run(SyncTestUtils_completeCurrentProgramRepsActions(mockReducer.state, [[5, 5, 5]]));
    await SyncTestUtils_finishWorkout(mockReducer);

    expect(mockReducer.state.storage.history.length).to.equal(1);
    const entry = mockReducer.state.storage.history[0].entries[0];

    expect(entry.descriptionSnapshot).to.equal("Squat **deep**");

    expect(entry.progressSnapshot, "progressSnapshot should be captured").to.not.be.undefined;
    const snapshot = entry.progressSnapshot!;
    const hasChanges =
      Object.keys(snapshot.diffVars ?? {}).length > 0 || Object.keys(snapshot.diffState ?? {}).length > 0;
    expect(hasChanges, "snapshot should record the lp progression").to.equal(true);
    // lp(5lb) adds 5lb to the working weight after a successful day
    expect(JSON.stringify(snapshot)).to.contain("5lb");
  });

  it("stores print lines with text and moves update prints into the snapshot at finish", async () => {
    const { mockReducer } = await SyncTestUtils_initTheApp("web_123");
    const textProgram: IProgram = {
      ...programWithDescription,
      id: "textProgram",
      planner: {
        vtype: "planner",
        name: "Text Program",
        weeks: [
          {
            name: "Week 1",
            days: [
              {
                name: "Day 1",
                exerciseText: [
                  'tmpl / used: none / 2x5 / 100lb / update: custom() {~ print("set", setIndex) ~} / progress: custom() {~',
                  '  if (isExercise("Squat") && isProgramExercise("t1: Squat")) { weights += 10lb }',
                  '  print("e1RM: " + rm1, exercise)',
                  "~}",
                  "t1: Squat / ...tmpl",
                ].join("\n"),
              },
            ],
          },
        ],
      },
    };
    await mockReducer.run([
      SyncTestUtils_mockDispatch((ds) => Program_cloneProgram(ds, textProgram, mockReducer.state.storage.settings)),
    ]);

    await SyncTestUtils_startWorkout(mockReducer);
    await mockReducer.run(SyncTestUtils_completeCurrentProgramRepsActions(mockReducer.state, [[5, 5]]));
    const activeEntry = Progress_getProgress(mockReducer.state)!.entries[0];
    expect(activeEntry.updatePrintLines).to.eql(["set, 2"]);
    expect(activeEntry.updatePrints).to.equal(undefined);

    await SyncTestUtils_finishWorkout(mockReducer);
    const entry = mockReducer.state.storage.history[0].entries[0];
    expect(entry.updatePrintLines).to.equal(undefined);
    expect(entry.progressSnapshot?.updatePrintLines).to.eql(["set, 2"]);
    expect(entry.progressSnapshot?.printLines?.[0]).to.match(/^e1RM: .*, t1: Squat$/);
    expect(entry.progressSnapshot?.prints).to.equal(undefined);
    expect(JSON.stringify(entry.progressSnapshot?.diffVars)).to.contain("10lb");
  });

  it("does not capture a snapshot when there is no progression or description", async () => {
    const { mockReducer } = await SyncTestUtils_initTheApp("web_123");
    const noProgressionProgram: IProgram = {
      ...programWithDescription,
      id: "noProgression",
      planner: {
        vtype: "planner",
        name: "No Progression",
        weeks: [
          {
            name: "Week 1",
            days: [{ name: "Day 1", exerciseText: "Squat / 2x5 / 100lb" }],
          },
        ],
      },
    };
    await mockReducer.run([
      SyncTestUtils_mockDispatch((ds) =>
        Program_cloneProgram(ds, noProgressionProgram, mockReducer.state.storage.settings)
      ),
    ]);

    await SyncTestUtils_startWorkout(mockReducer);
    await mockReducer.run(SyncTestUtils_completeCurrentProgramRepsActions(mockReducer.state, [[5, 5]]));
    await SyncTestUtils_finishWorkout(mockReducer);

    const entry = mockReducer.state.storage.history[0].entries[0];
    expect(entry.descriptionSnapshot).to.be.undefined;
    expect(entry.progressSnapshot).to.be.undefined;
  });
});
