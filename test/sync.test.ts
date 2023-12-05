import "mocha";
import { expect } from "chai";
import { getInitialState, IAction } from "../src/ducks/reducer";
import { Storage } from "../src/models/storage";
import { Service } from "../src/api/service";
import { MockAudioInterface } from "../src/lib/audioInterface";
import { AsyncQueue } from "../src/utils/asyncQueue";
import { IEnv, IState, updateState } from "../src/models/state";
import { UrlUtils } from "../src/utils/url";
import { getRawHandler } from "../lambda";
import { MockLogUtil } from "./utils/mockLogUtil";
import { buildMockDi, IMockDI } from "./utils/mockDi";
import { MockFetch } from "./utils/mockFetch";
import { MockReducer } from "./utils/mockReducer";
import { Thunk } from "../src/ducks/thunks";
import { IDispatch, IThunk } from "../src/ducks/types";
import { Program } from "../src/models/program";
import { basicBeginnerProgram } from "../src/programs/basicBeginnerProgram";
import { IHistoryRecord, IProgram, ISettings } from "../src/types";
import { userTableNames } from "../lambda/dao/userDao";
import { ObjectUtils } from "../src/utils/object";
import { lb } from "lens-shmens";
import sinon from "sinon";
import { EditStats } from "../src/models/editStats";

function mockDispatch(cb: (ds: IDispatch) => void): IAction | IThunk {
  let extractedAction: IAction | IThunk | undefined;
  const dispatch = (action: IAction | IThunk): void => {
    extractedAction = action;
  };
  cb(dispatch);
  if (extractedAction == null) {
    throw new Error("Missing action");
  }
  return extractedAction;
}

async function initTheAppAndRecordWorkout(): Promise<{
  di: IMockDI;
  log: MockLogUtil;
  mockReducer: MockReducer<IState, IAction, IEnv>;
  env: IEnv;
}> {
  const aStorage = { ...Storage.getDefault(), email: "admin@example.com" };
  const log = new MockLogUtil();
  const mockFetch = new MockFetch(aStorage.tempUserId);
  const fetch = mockFetch.fetch.bind(mockFetch);
  const di = buildMockDi(log, fetch);
  di.dynamo.addMockData({
    lftUsers: {
      [JSON.stringify({ id: aStorage.tempUserId })]: {
        id: aStorage.tempUserId,
        email: aStorage.email,
        createdAt: Date.now(),
        storage: aStorage,
      },
    },
  });
  const handler = getRawHandler(di);
  mockFetch.handler = handler;
  const service = new Service(fetch);
  const queue = new AsyncQueue();
  const env: IEnv = { service, audio: new MockAudioInterface(), queue };
  const url = UrlUtils.build("https://www.liftosaur.com");
  const initialState = await getInitialState(fetch, { url, storage: aStorage });
  const mockReducer = MockReducer.build(initialState, env);
  await mockReducer.run([Thunk.fetchStorage(), Thunk.fetchInitial()]);

  await mockReducer.run([mockDispatch((ds) => Program.cloneProgram(ds, basicBeginnerProgram))]);
  await logWorkout(mockReducer, basicBeginnerProgram, [
    [5, 5, 5],
    [5, 5, 5],
    [5, 5, 5],
  ]);

  return { di, log, mockReducer, env };
}

before(() => {
  // @ts-ignore
  global.__API_HOST__ = "https://www.liftosaur.com";
  // @ts-ignore
  global.__ENV__ = "prod";
  // @ts-ignore
  global.Rollbar = {
    configure: () => undefined,
  };
  let ts = 0;
  sinon.stub(Date, "now").callsFake(() => {
    ts += 1;
    return ts;
  });
});

describe("sync", () => {
  it("properly runs appendable safe syncs", async () => {
    const { di, mockReducer, log } = await initTheAppAndRecordWorkout();

    expect(log.logs.filter((l) => l === "Appendable safe update")).to.length(2);
    expect(mockReducer.state.storage.currentProgramId).to.equal(basicBeginnerProgram.id);
    expect(mockReducer.state.storage.programs).to.length(1);
    expect(mockReducer.state.storage.history).to.length(1);

    expect(await di.dynamo.scan({ tableName: userTableNames.prod.historyRecords })).to.length(1);
    expect(await di.dynamo.scan({ tableName: userTableNames.prod.programs })).to.length(1);
  });

  it("request full storage before merging", async () => {
    const { mockReducer, log, env } = await initTheAppAndRecordWorkout();
    const mockReducer2 = MockReducer.build(ObjectUtils.clone(mockReducer.state), env);
    await logWorkout(mockReducer2, basicBeginnerProgram, [
      [5, 5, 5],
      [5, 5, 5],
      [5, 5, 5],
    ]);
    await mockReducer.run([
      { type: "UpdateSettings", lensRecording: lb<ISettings>().p("isPublicProfile").record(true) },
    ]);

    const filteredLogs = log.logs.filter((l) => l === "Requesting full storage" || l === "Merging the storages");
    expect(filteredLogs).to.eql(["Requesting full storage", "Merging the storages"]);
  });

  it("merge runs appendable safe syncs", async () => {
    const { mockReducer, log, env } = await initTheAppAndRecordWorkout();
    const mockReducer2 = MockReducer.build(ObjectUtils.clone(mockReducer.state), env);
    await logWorkout(mockReducer2, basicBeginnerProgram, [
      [5, 5, 5],
      [5, 5, 5],
      [5, 5, 5],
    ]);
    await logWorkout(mockReducer, basicBeginnerProgram, [
      [5, 4, 3],
      [5, 4, 3],
      [5, 4, 3],
    ]);
    expect(log.logs.filter((l) => l === "Appendable safe update")).to.length(3);
    expect(log.logs.filter((l) => l === "Merging the storages")).to.length(1);
  });

  it("deletes the stats properly during merging", async () => {
    const { mockReducer, env } = await initTheAppAndRecordWorkout();
    const mockReducer2 = MockReducer.build(ObjectUtils.clone(mockReducer.state), env);
    await logStat(mockReducer2, 100);
    await logStat(mockReducer, 120);
    await logStat(mockReducer2, 130);
    await logStat(mockReducer, 140);

    const weights = mockReducer.state.storage.stats.weight.weight || [];
    const weight140Index = weights.findIndex((w) => w.value.value === 140) ?? 0;
    const weight130Index = weights.findIndex((w) => w.value.value === 130) ?? 0;
    await mockReducer.run([
      mockDispatch((ds) => EditStats.deleteWeightStat(ds, "weight", weight130Index, weights[weight130Index].timestamp)),
      mockDispatch((ds) => EditStats.deleteWeightStat(ds, "weight", weight140Index, weights[weight140Index].timestamp)),
    ]);
    await logStat(mockReducer2, 150);
    expect((mockReducer2.state.storage.stats.weight.weight || []).map((w) => w.value.value)).to.eql([100, 120, 150]);
    await mockReducer.run([Thunk.fetchStorage()]);
    expect((mockReducer.state.storage.stats.weight.weight || []).map((w) => w.value.value)).to.eql([100, 120, 150]);
  });

  it("runs migrations before merging", async () => {
    const { mockReducer, env } = await initTheAppAndRecordWorkout();
    const mockReducer2 = MockReducer.build(ObjectUtils.clone(mockReducer.state), env);
    await logWorkout(mockReducer2, basicBeginnerProgram, [
      [5, 5, 5],
      [5, 5, 5],
      [5, 5, 5],
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (mockReducer.state as any).storage.deletedHistory;
    mockReducer.state.storage.version = "20231009191950";
    await mockReducer.run([Thunk.sync({ withHistory: true, withPrograms: true, withStats: true })]);
    expect(mockReducer.state.storage.deletedHistory).to.eql([]);
  });

  it("merges programs properly", async () => {
    const { mockReducer, env } = await initTheAppAndRecordWorkout();
    const mockReducer2 = MockReducer.build(ObjectUtils.clone(mockReducer.state), env);
    await mockReducer.run([
      mockDispatch((ds) =>
        updateState(ds, [
          lb<IState>().p("storage").p("programs").i(0).p("exercises").i(0).p("name").record("New Name!"),
        ])
      ),
    ]);
    await mockReducer2.run([
      mockDispatch((ds) =>
        updateState(ds, [
          lb<IState>()
            .p("storage")
            .p("programs")
            .i(0)
            .p("exercises")
            .i(0)
            .p("exerciseType")
            .p("equipment")
            .record("band"),
        ])
      ),
    ]);
    expect(mockReducer2.state.storage.programs[0].exercises[0].name).to.equal("New Name!");
    expect(mockReducer2.state.storage.programs[0].exercises[0].exerciseType.equipment).to.equal("band");
  });

  it("ignores diff paths and uses new storage during storage fetching", async () => {
    const { mockReducer, env } = await initTheAppAndRecordWorkout();
    const mockReducer2 = MockReducer.build(ObjectUtils.clone(mockReducer.state), env);
    await mockReducer.run([
      mockDispatch((ds) =>
        updateState(ds, [
          lb<IState>().p("storage").p("programs").i(0).p("exercises").i(0).p("name").record("New Name!"),
        ])
      ),
    ]);
    await mockReducer2.run([Thunk.fetchStorage()]);
    expect(mockReducer2.state.storage.programs[0].exercises[0].name).to.equal("New Name!");
  });
});

async function logWorkout(
  mockReducer: MockReducer<IState, IAction, IEnv>,
  program: IProgram,
  reps: number[][]
): Promise<void> {
  await mockReducer.run([{ type: "StartProgramDayAction" }]);
  await mockReducer.run([...completeRepsActions(program, mockReducer.state.progress[0]!, reps)]);
  await mockReducer.run([{ type: "FinishProgramDayAction" }]);
}

async function logStat(mockReducer: MockReducer<IState, IAction, IEnv>, bodyweight: number): Promise<void> {
  await mockReducer.run([
    mockDispatch((ds) =>
      EditStats.addWeightStats(ds, {
        weight: { value: bodyweight, unit: "kg" },
      })
    ),
  ]);
}

function completeRepsActions(program: IProgram, progress: IHistoryRecord, reps: number[][]): IAction[] {
  const allProgramExercises = program.exercises;
  return progress.entries.reduce<IAction[]>((memo, entry, entryIndex) => {
    const actions = entry.sets.reduce<IAction[]>((memo2, set, setIndex) => {
      const r = reps[entryIndex][setIndex];
      const programExercise = program.exercises.find((e) => e.id === entry.programExerciseId);
      const setActions: IAction[] = [];
      if (set.isAmrap) {
        setActions.push({
          type: "ChangeRepsAction",
          entryIndex,
          setIndex,
          programExercise,
          allProgramExercises,
          mode: "workout",
        });
        setActions.push({
          type: "ChangeAMRAPAction",
          amrapValue: r,
          rpeValue: undefined,
          isAmrap: true,
          logRpe: false,
          userVars: {},
          programExerciseId: programExercise?.id,
        });
      } else {
        for (let i = set.reps; i >= r; i -= 1) {
          setActions.push({
            type: "ChangeRepsAction",
            entryIndex,
            setIndex,
            programExercise,
            allProgramExercises,
            mode: "workout",
          });
        }
      }
      return [...memo2, ...setActions];
    }, []);
    return memo.concat(actions);
  }, []);
}
