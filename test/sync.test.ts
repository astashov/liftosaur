import { getInitialState, reducerWrapper } from "../src/ducks/reducer";
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

describe("Sync", () => {
  it("syncs", async () => {
    const aStorage = Storage.getDefault();
    const log = new MockLogUtil();
    const mockFetch = new MockFetch(aStorage.tempUserId);
    const fetch = mockFetch.fetch.bind(mockFetch);
    const di = buildMockDi(log, fetch);
    di.dynamo.addMockData({
      lftUsers: {
        [JSON.stringify({ id: aStorage.tempUserId })]: {
          id: aStorage.tempUserId,
          email: "admin@example.com",
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
    const mockReducer = new MockReducer(reducerWrapper, initialState, env, []);
    await mockReducer.run([Thunk.fetchStorage(), Thunk.fetchInitial()]);
    console.log(mockReducer.state);
  });
});
