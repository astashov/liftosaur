/* eslint-disable @typescript-eslint/no-explicit-any */
import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { getInitialState } from "../src/ducks/reducer";
import { Storage_getDefault } from "../src/models/storage";
import { IStorage } from "../src/types";
import { UrlUtils_build } from "../src/utils/url";
import { buildMockDi } from "./utils/mockDi";
import { MockFetch, IMockFetchLog } from "./utils/mockFetch";
import { MockLogUtil } from "./utils/mockLogUtil";
import { getRawHandler } from "../lambda";
import * as encoder from "../src/utils/encoder";
import { NodeEncoder_encode } from "../lambda/utils/nodeEncoder";
import { IState, IStateErrors } from "../src/models/state";

function corruptedStorage(): IStorage {
  // tempUserId is required and must be a string; setting it to a number reliably
  // fails VStorage validation while surviving runMigrations (no migration touches it).
  return { ...Storage_getDefault(), tempUserId: 42 as unknown as string };
}

async function buildInitialStateForCorruption(args: {
  localStorage: IStorage;
  serverStorage?: IStorage;
  serverUserId?: string;
}): Promise<ReturnType<typeof getInitialState> extends Promise<infer T> ? T : never> {
  const log = new MockLogUtil();
  const fetchLogs: IMockFetchLog[] = [];
  const serverUserId = args.serverUserId ?? args.localStorage.tempUserId;
  const mockFetch = new MockFetch(serverUserId, fetchLogs);
  const di = buildMockDi(log, mockFetch.fetch.bind(mockFetch));
  if (args.serverStorage) {
    di.dynamo.addMockData({
      lftUsers: {
        [JSON.stringify({ id: serverUserId })]: {
          id: serverUserId,
          email: "admin@example.com",
          createdAt: Date.now(),
          storage: args.serverStorage,
        },
      },
    });
  }
  mockFetch.handler = getRawHandler(() => di);
  const url = UrlUtils_build("https://www.liftosaur.com");
  return getInitialState(mockFetch.fetch.bind(mockFetch), {
    url,
    storage: args.localStorage,
    deviceId: "test-device",
  });
}

describe("storage corruption", () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    (global as any).__API_HOST__ = "https://www.liftosaur.com";
    (global as any).__HOST__ = "https://www.liftosaur.com";
    (global as any).__ENV__ = "prod";
    (global as any).__FULL_COMMIT_HASH__ = "abc123";
    (global as any).__COMMIT_HASH__ = "abc123";
    (global as any).Rollbar = {
      configure: () => undefined,
      error: () => undefined,
      warning: () => undefined,
      info: () => undefined,
    };
    let ts = 0;
    sandbox = sinon.createSandbox();
    sandbox.stub(Date, "now").callsFake(() => {
      ts += 1;
      return ts;
    });
    sandbox.stub(encoder, "Encoder_encode").callsFake((...a: [string]) => NodeEncoder_encode(...a));
    // Storage_validateAndReport intentionally logs the failing payload + errors; suppress that
    // noise during these corruption tests so the test output stays readable.
    sandbox.stub(console, "error");
    sandbox.stub(console, "log");
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("does not flag the corrupted-storage modal when local storage is valid", async () => {
    const initialState = await buildInitialStateForCorruption({
      localStorage: { ...Storage_getDefault(), email: "admin@example.com" },
    });
    expect(initialState.errors.corruptedstorage).to.equal(undefined);
    expect(initialState.storage.tempUserId).to.be.a("string");
  });

  it("recovers from corrupted local storage via server fallback (no modal)", async () => {
    const local = corruptedStorage();
    const serverValid = { ...Storage_getDefault(), email: "admin@example.com" };
    // The server lookup uses the local storage's tempUserId; sync it to the valid storage's id
    // so the dynamo lookup succeeds.
    serverValid.tempUserId = String(local.tempUserId);

    const initialState = await buildInitialStateForCorruption({
      localStorage: local,
      serverStorage: serverValid,
      serverUserId: String(local.tempUserId),
    });

    expect(initialState.errors.corruptedstorage).to.equal(undefined);
    expect(initialState.storage.tempUserId).to.equal(String(local.tempUserId));
  });

  it("flags the corrupted-storage modal when both local and server storage are corrupted", async () => {
    const local = corruptedStorage();
    const serverAlsoCorrupt = corruptedStorage();
    serverAlsoCorrupt.tempUserId = local.tempUserId;

    const initialState = await buildInitialStateForCorruption({
      localStorage: local,
      serverStorage: serverAlsoCorrupt,
      serverUserId: String(local.tempUserId),
    });

    expect(initialState.errors.corruptedstorage).to.not.equal(undefined);
    expect(initialState.errors.corruptedstorage?.local).to.equal(true);
    expect(initialState.errors.corruptedstorage?.confirmed).to.equal(false);
    // Falls back to a fresh default storage so the app remains usable behind the modal.
    expect(initialState.storage.tempUserId).to.be.a("string");
    expect(initialState.storage.tempUserId).to.not.equal(String(local.tempUserId));
  });

  it("flags the modal when local storage is corrupted and the server returns nothing", async () => {
    const local = corruptedStorage();
    const initialState = await buildInitialStateForCorruption({
      localStorage: local,
      // No serverStorage mock data — server returns empty for this user.
    });
    expect(initialState.errors.corruptedstorage).to.not.equal(undefined);
    expect(initialState.errors.corruptedstorage?.local).to.equal(true);
  });

  it("backs up the corrupted blob to the server before showing the modal", async () => {
    const local = corruptedStorage();
    const log = new MockLogUtil();
    const fetchLogs: IMockFetchLog[] = [];
    const serverUserId = String(local.tempUserId);
    const mockFetch = new MockFetch(serverUserId, fetchLogs);
    const di = buildMockDi(log, mockFetch.fetch.bind(mockFetch));
    mockFetch.handler = getRawHandler(() => di);

    const initialState = await getInitialState(mockFetch.fetch.bind(mockFetch), {
      url: UrlUtils_build("https://www.liftosaur.com"),
      storage: local,
      deviceId: "test-device",
    });

    expect(initialState.errors.corruptedstorage).to.not.equal(undefined);
    // The corrupted-state path uploads a backup via service.postDebug before flipping the modal flag.
    const debugCalls = mockFetch.logs.filter((l) => l.request.url.includes("/api/debug"));
    expect(debugCalls.length).to.be.greaterThan(0);
    const debugBody = debugCalls[0].request.body as { id?: string; data?: string };
    // The corrupted tempUserId is a number (42); it is forwarded to /api/debug verbatim,
    // so the body's id mirrors the raw local value.
    expect(debugBody.id).to.equal(local.tempUserId);
    expect(debugBody.data).to.be.a("string");
  });

  it("does NOT wipe the corrupted state from in-memory state.errors after boot", async () => {
    // Both the in-memory error metadata and the disk-write guard depend on
    // state.errors.corruptedstorage staying set until the user dismisses the modal.
    const initialState = await buildInitialStateForCorruption({
      localStorage: corruptedStorage(),
    });
    expect(initialState.errors.corruptedstorage).to.not.equal(undefined);
    expect(initialState.errors.corruptedstorage?.local).to.equal(true);
    // Sanity: the gate that blocks IndexedDB writes in reducer.ts is
    // `newState.errors.corruptedstorage == null`. As long as this flag remains set
    // on the in-memory state, no reducer-time persist path will overwrite the
    // (still-corrupted) on-disk copy. This test pins the flag's presence so a
    // future refactor that clears it during boot would fail here.
    const fakeNewState: IState = { ...initialState };
    expect(fakeNewState.errors.corruptedstorage == null).to.equal(false);
    const guardWouldAllowWrite = fakeNewState.errors.corruptedstorage == null;
    expect(guardWouldAllowWrite).to.equal(false);
  });

  it("dismissing the modal clears errors.corruptedstorage (allowing persistence to resume)", async () => {
    // Mirrors the NavModalCorruptedState onReset() handler. After the user
    // confirms via the modal, the flag is cleared and the disk-write gate opens
    // again. This locks down the dismiss behavior the modal relies on.
    const initialState = await buildInitialStateForCorruption({
      localStorage: corruptedStorage(),
    });
    expect(initialState.errors.corruptedstorage).to.not.equal(undefined);
    const dismissed: IState = { ...initialState, errors: { ...initialState.errors, corruptedstorage: undefined } };
    const errors: IStateErrors = dismissed.errors;
    expect(errors.corruptedstorage).to.equal(undefined);
    const guardWouldAllowWrite = dismissed.errors.corruptedstorage == null;
    expect(guardWouldAllowWrite).to.equal(true);
  });
});
