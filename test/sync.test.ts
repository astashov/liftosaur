import { getInitialState, IAction, reducerWrapper } from "../src/ducks/reducer";
import { Storage } from "../src/models/storage";
import { Service } from "../src/api/service";
import { MockAudioInterface } from "../src/lib/audioInterface";
import { AsyncQueue } from "../src/utils/asyncQueue";
import { IEnv } from "../src/models/state";
import { UrlUtils } from "../src/utils/url";
import { getRawHandler } from "../lambda";
import { MockLogUtil } from "./utils/mockLogUtil";
import { buildMockDi } from "./utils/mockDi";
import { MockFetch } from "./utils/mockFetch";
import { MockReducer } from "./utils/mockReducer";
import { Thunk } from "../src/ducks/thunks";
import { IDispatch, IThunk } from "../src/ducks/types";
import { Program } from "../src/models/program";
import { basicBeginnerProgram } from "../src/programs/basicBeginnerProgram";
import { IHistoryRecord, IProgram } from "../src/types";
import { userTableNames } from "../lambda/dao/userDao";

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

describe("Sync", () => {
  it("properly runs appendable safe syncs", async () => {
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
    const mockReducer = new MockReducer(reducerWrapper, initialState, env, [
      async (dispatch, action, oldState, newState) => {
        if (Storage.isChanged(oldState.storage, newState.storage)) {
          await dispatch(
            Thunk.sync({
              withHistory: oldState.storage.history !== newState.storage.history,
              withStats: oldState.storage.stats !== newState.storage.stats,
              withPrograms: oldState.storage.programs !== newState.storage.programs,
            })
          );
        }
      },
    ]);
    await mockReducer.run([Thunk.fetchStorage(), Thunk.fetchInitial()]);

    await mockReducer.run([
      mockDispatch((ds) => Program.cloneProgram(ds, basicBeginnerProgram)),
      { type: "StartProgramDayAction" },
    ]);
    await mockReducer.run([...completeAllRepsActions(basicBeginnerProgram, mockReducer.state.progress[0]!)]);
    await mockReducer.run([{ type: "FinishProgramDayAction" }]);

    expect(log.logs.filter((l) => l === "Appendable safe update")).toHaveLength(2);
    expect(mockReducer.state.storage.currentProgramId).toEqual(basicBeginnerProgram.id);
    expect(mockReducer.state.storage.programs).toHaveLength(1);
    expect(mockReducer.state.storage.history).toHaveLength(1);

    expect(await di.dynamo.scan({ tableName: userTableNames.prod.historyRecords })).toHaveLength(1);
    expect(await di.dynamo.scan({ tableName: userTableNames.prod.programs })).toHaveLength(1);
  });
});

function completeAllRepsActions(program: IProgram, progress: IHistoryRecord): IAction[] {
  const allProgramExercises = program.exercises;
  return progress.entries.reduce<IAction[]>((memo, entry, entryIndex) => {
    const actions = entry.sets.reduce<IAction[]>((memo2, set, setIndex) => {
      const programExercise = program.exercises.find((e) => e.id === entry.programExerciseId);
      const setActions: IAction[] = [
        { type: "ChangeRepsAction", entryIndex, setIndex, programExercise, allProgramExercises, mode: "workout" },
      ];
      if (set.isAmrap) {
        setActions.push({
          type: "ChangeAMRAPAction",
          amrapValue: set.reps,
          rpeValue: undefined,
          isAmrap: true,
          logRpe: false,
          userVars: {},
          programExerciseId: programExercise?.id,
        });
      }
      return [...memo2, ...setActions];
    }, []);
    return memo.concat(actions);
  }, []);
}
