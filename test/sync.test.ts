import "mocha";
import { expect } from "chai";
import { getInitialState, IAction } from "../src/ducks/reducer";
import { Storage } from "../src/models/storage";
import { Service } from "../src/api/service";
import { MockAudioInterface } from "../src/lib/audioInterface";
import { AsyncQueue } from "../src/utils/asyncQueue";
import { IEnv, IState } from "../src/models/state";
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
import { userTableNames, IUserDao } from "../lambda/dao/userDao";
import { ObjectUtils } from "../src/utils/object";
import { lb } from "lens-shmens";
import sinon from "sinon";
import { EditStats } from "../src/models/editStats";
import { Settings } from "../src/models/settings";

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
  await mockReducer.run([Thunk.fetchInitial(), Thunk.sync2({ force: true })]);

  await mockReducer.run([
    mockDispatch((ds) => Program.cloneProgram(ds, basicBeginnerProgram, initialState.storage.settings)),
  ]);
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
  global.__FULL_COMMIT_HASH__ = "abc123";
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

    expect(log.logs.filter((l) => l === "Fetch: Safe update")).to.length(3);
    expect(log.logs.filter((l) => l === "Fetch: Merging update")).to.length(1);
    expect(mockReducer.state.storage.currentProgramId).to.equal(basicBeginnerProgram.id);
    expect(mockReducer.state.storage.programs).to.length(1);
    expect(mockReducer.state.storage.history).to.length(1);

    expect(await di.dynamo.scan({ tableName: userTableNames.prod.historyRecords })).to.length(1);
    expect(await di.dynamo.scan({ tableName: userTableNames.prod.programs })).to.length(1);
  });

  it("merge history and settings update", async () => {
    const { mockReducer, log, env, di } = await initTheAppAndRecordWorkout();
    const mockReducer2 = MockReducer.build(ObjectUtils.clone(mockReducer.state), env);
    await logWorkout(mockReducer2, basicBeginnerProgram, [
      [5, 5, 5],
      [5, 5, 5],
      [5, 5, 5],
    ]);
    await mockReducer.run([
      { type: "UpdateSettings", lensRecording: lb<ISettings>().p("isPublicProfile").record(true) },
    ]);
    expect(mockReducer.state.storage.settings.isPublicProfile).to.equal(true);
    expect(mockReducer.state.storage.history.length).to.equal(2);

    const dbHistoryRecords = await di.dynamo.scan<IHistoryRecord>({ tableName: userTableNames.prod.historyRecords });
    const dbUsers = await di.dynamo.scan<IUserDao>({ tableName: userTableNames.prod.users });
    expect(dbHistoryRecords.length).to.equal(2);
    expect(dbUsers[0].storage.settings.isPublicProfile).to.equal(true);

    const filteredLogs = log.logs.filter((l) => l.startsWith("Fetch:"));
    expect(filteredLogs).to.eql([
      "Fetch: Merging update",
      "Fetch: Safe update",
      "Fetch: Safe update",
      "Fetch: Safe update",
      "Fetch: Safe update",
      "Fetch: Merging update",
    ]);
  });

  it("merge 2 history updates", async () => {
    const { mockReducer, log, env, di } = await initTheAppAndRecordWorkout();
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
    const dbHistoryRecords = await di.dynamo.scan<IHistoryRecord>({ tableName: userTableNames.prod.historyRecords });
    expect(dbHistoryRecords.length).to.equal(3);

    const filteredLogs = log.logs.filter((l) => l.startsWith("Fetch:"));
    expect(filteredLogs).to.eql([
      "Fetch: Merging update",
      "Fetch: Safe update",
      "Fetch: Safe update",
      "Fetch: Safe update",
      "Fetch: Safe update",
      "Fetch: Merging update",
    ]);
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
    await mockReducer.run([Thunk.sync2({ force: true })]);
    expect((mockReducer.state.storage.stats.weight.weight || []).map((w) => w.value.value)).to.eql([100, 120, 150]);
  });

  it("cancels sync if not the latest version", async () => {
    const { mockReducer, env } = await initTheAppAndRecordWorkout();
    const mockReducer2 = MockReducer.build(ObjectUtils.clone(mockReducer.state), env);
    await logWorkout(mockReducer2, basicBeginnerProgram, [
      [5, 5, 5],
      [5, 5, 5],
      [5, 5, 5],
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockReducer.state.storage.version = "20231009191950";
    // expect to throw
    let threw = false;
    let msg = "";
    global.alert = (m) => (msg = m);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.window = { alert: global.alert } as any;
    try {
      await mockReducer.run([Thunk.sync2({ force: true })]);
    } catch (error) {
      const e = error as Error;
      expect(e.message).to.eql("outdated_client_storage");
      threw = true;
    }
    expect(threw).to.eql(true);
    // eslint-disable-next-line no-unused-expressions
    expect(msg).to.contain("kill/restart");
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
  const evaluatedProgram = Program.evaluate(program, Settings.build());
  return progress.entries.reduce<IAction[]>((memo, entry, entryIndex) => {
    const actions = entry.sets.reduce<IAction[]>((memo2, set, setIndex) => {
      const r = reps[entryIndex][setIndex];
      const programExercise = Program.getProgramExercise(progress.day, evaluatedProgram, entry.programExerciseId);
      const setActions: IAction[] = [];
      if (set.isAmrap) {
        setActions.push({
          type: "CompleteSetAction",
          entryIndex,
          setIndex,
          programExercise,
          mode: "workout",
        });
        setActions.push({
          type: "ChangeAMRAPAction",
          amrapValue: r,
          rpeValue: undefined,
          isAmrap: true,
          logRpe: false,
          userVars: {},
          entryIndex: entryIndex,
          setIndex: setIndex,
          programExercise: programExercise,
        });
      } else {
        for (let i = set.reps ?? 0; i >= r; i -= 1) {
          setActions.push({
            type: "CompleteSetAction",
            entryIndex,
            setIndex,
            programExercise,
            mode: "workout",
          });
        }
      }
      return [...memo2, ...setActions];
    }, []);
    return memo.concat(actions);
  }, []);
}
