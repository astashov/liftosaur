import { getRawHandler } from "../../lambda";
import { getInitialState, IAction } from "../../src/ducks/reducer";
import { Thunk } from "../../src/ducks/thunks";
import { IDispatch, IThunk } from "../../src/ducks/types";
import { MockAudioInterface } from "../../src/lib/audioInterface";
import { EditStats } from "../../src/models/editStats";
import { Service } from "../../src/api/service";
import { Program } from "../../src/models/program";
import { Storage } from "../../src/models/storage";
import { Settings } from "../../src/models/settings";
import { IEnv, IState } from "../../src/models/state";
import { basicBeginnerProgram } from "../../src/programs/basicBeginnerProgram";
import { IProgram, IHistoryRecord } from "../../src/types";
import { AsyncQueue } from "../../src/utils/asyncQueue";
import { UrlUtils } from "../../src/utils/url";
import { IMockDI, buildMockDi } from "./mockDi";
import { IMockFetchLog, MockFetch } from "./mockFetch";
import { MockLogUtil } from "./mockLogUtil";
import { MockReducer } from "./mockReducer";

export class SyncTestUtils {
  public static mockDispatch(cb: (ds: IDispatch) => void): IAction | IThunk {
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

  public static async startWorkout(mockReducer: MockReducer<IState, IAction, IEnv>): Promise<void> {
    await mockReducer.run([{ type: "StartProgramDayAction" }]);
  }

  public static async finishWorkout(mockReducer: MockReducer<IState, IAction, IEnv>): Promise<void> {
    await mockReducer.run([{ type: "FinishProgramDayAction" }]);
  }

  public static async logWorkout(
    mockReducer: MockReducer<IState, IAction, IEnv>,
    program: IProgram,
    reps: number[][]
  ): Promise<void> {
    await this.startWorkout(mockReducer);
    await mockReducer.run([...this.completeRepsActions(program, mockReducer.state.storage.progress!, reps)]);
    await this.finishWorkout(mockReducer);
  }

  public static async logStat(mockReducer: MockReducer<IState, IAction, IEnv>, bodyweight: number): Promise<void> {
    await mockReducer.run([
      this.mockDispatch((ds) =>
        EditStats.addWeightStats(ds, {
          weight: { value: bodyweight, unit: "kg" },
        })
      ),
    ]);
  }

  public static completeRepsActions(program: IProgram, progress: IHistoryRecord, reps: number[][]): IAction[] {
    const evaluatedProgram = Program.evaluate(program, Settings.build());
    const setActions: IAction[] = [];
    for (let entryIndex = 0; entryIndex < reps.length; entryIndex += 1) {
      const entrySets = reps[entryIndex];
      for (let setIndex = 0; setIndex < entrySets.length; setIndex += 1) {
        const r = entrySets[setIndex];
        const entry = progress.entries[entryIndex];
        const set = entry.sets[setIndex];
        const programExercise = Program.getProgramExercise(progress.day, evaluatedProgram, entry.programExerciseId);
        if (set.isAmrap) {
          setActions.push({
            type: "CompleteSetAction",
            entryIndex,
            setIndex,
            programExercise,
            mode: "workout",
            isPlayground: false,
            forceUpdateEntryIndex: false,
            isExternal: false,
          });
          setActions.push({
            type: "ChangeAMRAPAction",
            amrapValue: r,
            rpeValue: undefined,
            isAmrap: true,
            logRpe: false,
            userVars: {},
            isPlayground: false,
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
              isPlayground: false,
              mode: "workout",
              forceUpdateEntryIndex: false,
              isExternal: false,
            });
          }
        }
      }
    }
    return setActions;
  }

  public static async initTheApp(): Promise<{
    di: IMockDI;
    log: MockLogUtil;
    fetchLogs: IMockFetchLog[];
    mockReducer: MockReducer<IState, IAction, IEnv>;
    env: IEnv;
  }> {
    const aStorage = { ...Storage.getDefault(), email: "admin@example.com" };
    const log = new MockLogUtil();
    const fetchLogs: IMockFetchLog[] = [];
    const mockFetch = new MockFetch(aStorage.tempUserId, fetchLogs);
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
    const handler = getRawHandler(() => di);
    mockFetch.handler = handler;
    const service = new Service(fetch);
    const queue = new AsyncQueue();
    const env: IEnv = { service, audio: new MockAudioInterface(), queue };
    const url = UrlUtils.build("https://www.liftosaur.com");
    const initialState = await getInitialState(fetch, { url, storage: aStorage, deviceId: "web_123" });
    const mockReducer = MockReducer.build(initialState, env);
    await mockReducer.run([Thunk.fetchInitial(), Thunk.sync2({ force: true })]);

    await mockReducer.run([
      this.mockDispatch((ds) => Program.cloneProgram(ds, basicBeginnerProgram, initialState.storage.settings)),
    ]);
    return { di, fetchLogs, log, mockReducer, env };
  }

  public static async initTheAppAndRecordWorkout(): Promise<{
    di: IMockDI;
    log: MockLogUtil;
    mockReducer: MockReducer<IState, IAction, IEnv>;
    env: IEnv;
    fetchLogs: IMockFetchLog[];
  }> {
    const { di, log, mockReducer, env, fetchLogs } = await this.initTheApp();
    await this.logWorkout(mockReducer, basicBeginnerProgram, [
      [5, 5, 5],
      [5, 5, 5],
      [5, 5, 5],
    ]);
    return { di, log, mockReducer, env, fetchLogs };
  }
}
