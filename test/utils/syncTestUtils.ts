import { getRawHandler } from "../../lambda";
import { getInitialState, IAction } from "../../src/ducks/reducer";
import { Thunk_fetchInitial, Thunk_sync2 } from "../../src/ducks/thunks";
import { IDispatch, IThunk } from "../../src/ducks/types";
import { MockAudioInterface } from "../../src/lib/audioInterface";
import { EditStats_addWeightStats } from "../../src/models/editStats";
import { Service } from "../../src/api/service";
import { Program_evaluate, Program_getProgramExercise, Program_cloneProgram } from "../../src/models/program";
import { Storage_getDefault } from "../../src/models/storage";
import { Settings_build } from "../../src/models/settings";
import { IEnv, IState } from "../../src/models/state";
import { basicBeginnerProgram } from "../../src/programs/basicBeginnerProgram";
import { IProgram, IHistoryRecord } from "../../src/types";
import { AsyncQueue } from "../../src/utils/asyncQueue";
import { UrlUtils_build } from "../../src/utils/url";
import { IMockDI, buildMockDi } from "./mockDi";
import { IMockFetchLog, MockFetch } from "./mockFetch";
import { MockLogUtil } from "./mockLogUtil";
import { MockReducer } from "./mockReducer";
import { lb } from "lens-shmens";
import { Progress_getProgress } from "../../src/models/progress";

export function SyncTestUtils_mockDispatch(cb: (ds: IDispatch) => void): IAction | IThunk {
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

export async function SyncTestUtils_startWorkout(mockReducer: MockReducer<IState, IAction, IEnv>): Promise<void> {
  await mockReducer.run([{ type: "StartProgramDayAction" }]);
}

export async function SyncTestUtils_finishWorkout(mockReducer: MockReducer<IState, IAction, IEnv>): Promise<void> {
  await mockReducer.run([{ type: "FinishProgramDayAction" }]);
}

export async function SyncTestUtils_logWorkout(
  mockReducer: MockReducer<IState, IAction, IEnv>,
  program: IProgram,
  reps: number[][]
): Promise<void> {
  await SyncTestUtils_startWorkout(mockReducer);
  await mockReducer.run([
    ...SyncTestUtils_completeRepsActions(program, Progress_getProgress(mockReducer.state)!, reps),
  ]);
  await SyncTestUtils_finishWorkout(mockReducer);
}

export async function SyncTestUtils_logStat(
  mockReducer: MockReducer<IState, IAction, IEnv>,
  bodyweight: number
): Promise<void> {
  await mockReducer.run([
    SyncTestUtils_mockDispatch((ds) =>
      EditStats_addWeightStats(ds, {
        weight: { value: bodyweight, unit: "kg" },
      })
    ),
  ]);
}

export function SyncTestUtils_completeCurrentProgramRepsActions(
  state: IState,
  reps: (number | undefined)[][]
): IAction[] {
  const program = state.storage.programs.find((p) => p.id === state.storage.currentProgramId)!;
  const progress = Progress_getProgress(state)!;
  return SyncTestUtils_completeRepsActions(program, progress, reps);
}

export function SyncTestUtils_completeRepsActions(
  program: IProgram,
  progress: IHistoryRecord,
  reps: (number | undefined)[][]
): IAction[] {
  const evaluatedProgram = Program_evaluate(program, Settings_build());
  const setActions: IAction[] = [];
  for (let entryIndex = 0; entryIndex < reps.length; entryIndex += 1) {
    const entrySets = reps[entryIndex];
    for (let setIndex = 0; setIndex < entrySets.length; setIndex += 1) {
      const r = entrySets[setIndex];
      if (r == null) {
        continue;
      }
      const entry = progress.entries[entryIndex];
      const set = entry.sets[setIndex];
      const programExercise = Program_getProgramExercise(progress.day, evaluatedProgram, entry.programExerciseId);
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
        setActions.push({
          type: "UpdateProgress",
          lensRecordings: [
            lb<IHistoryRecord>().p("entries").i(entryIndex).p("sets").i(setIndex).p("completedReps").record(r),
          ],
          desc: `Set completed reps to ${r}`,
        });
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
  return setActions;
}

export async function SyncTestUtils_initTheApp(deviceId: string): Promise<{
  di: IMockDI;
  log: MockLogUtil;
  mockFetch: MockFetch;
  mockReducer: MockReducer<IState, IAction, IEnv>;
  env: IEnv;
}> {
  const aStorage = { ...Storage_getDefault(), email: "admin@example.com" };
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
  const url = UrlUtils_build("https://www.liftosaur.com");
  const initialState = await getInitialState(fetch, { url, storage: aStorage, deviceId });
  const mockReducer = MockReducer.build(initialState, env);
  await mockReducer.run([Thunk_fetchInitial(), Thunk_sync2({ force: true })]);

  await mockReducer.run([
    SyncTestUtils_mockDispatch((ds) => Program_cloneProgram(ds, basicBeginnerProgram, initialState.storage.settings)),
  ]);
  return { di, mockFetch, log, mockReducer, env };
}

export async function SyncTestUtils_initTheAppAndRecordWorkout(deviceId: string): Promise<{
  di: IMockDI;
  log: MockLogUtil;
  mockFetch: MockFetch;
  mockReducer: MockReducer<IState, IAction, IEnv>;
  env: IEnv;
}> {
  const result = await SyncTestUtils_initTheApp(deviceId);
  await SyncTestUtils_logWorkout(result.mockReducer, basicBeginnerProgram, [
    [5, 5, 5],
    [5, 5, 5],
    [5, 5, 5],
  ]);
  return result;
}
