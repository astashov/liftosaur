/* eslint-disable @typescript-eslint/no-var-requires */
require("react-native-gesture-handler/jestSetup");

jest.mock("react-native-reanimated", () => {
  const actualMock = require("react-native-reanimated/mock");
  const base = actualMock.default ?? actualMock;
  const frameCallback = { setActive: jest.fn(), isActive: false, callbackId: 0 };
  const passthrough = ({ children }: { children?: unknown }): unknown => children ?? null;
  return {
    ...actualMock,
    default: base,
    useFrameCallback: () => frameCallback,
    LayoutAnimationConfig: passthrough,
  };
});
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);

jest.mock("react-native-haptic-feedback", () => ({ default: { trigger: jest.fn() }, trigger: jest.fn() }));

jest.mock("../../src/utils/posthog", () => ({
  lg: jest.fn(),
  lgDebug: jest.fn(),
  Posthog_capture: jest.fn(),
}));

jest.mock("../../src/utils/log", () => ({ LogUtils_log: jest.fn().mockResolvedValue(undefined) }));

jest.mock("../../src/utils/eventManager", () => ({
  EventManager_isAvailable: () => false,
  EventManager_log: jest.fn(),
  EventManager_flush: jest.fn().mockResolvedValue(undefined),
  EventManager_initTelemetry: jest.fn(),
}));

jest.mock("../../src/utils/analytics", () => ({
  Analytics_initialize: () => () => undefined,
  Analytics_setUserId: jest.fn(),
  Analytics_trackPurchase: jest.fn(),
  Analytics_trackSignUp: jest.fn(),
  Analytics_trackFinishWorkout: jest.fn(),
}));

jest.mock("../../src/utils/perfEnabled", () => ({
  PerfEnabled_tier1: () => false,
  PerfEnabled_tier2: () => false,
  PerfEnabled_isEnabled: () => false,
}));

jest.mock("react-native-worklets", () => {
  const identity = (value: unknown): unknown => value;
  return {
    createSerializable: identity,
    createShareable: identity,
    createSynchronizable: identity,
    createWorkletRuntime: () => ({}),
    isShareable: () => false,
    isSynchronizable: () => false,
    isWorkletFunction: () => false,
    makeShareable: identity,
    runOnJS: identity,
    runOnUI: identity,
    runOnUISync: identity,
    scheduleOnUI: (fn: () => void) => fn(),
    scheduleOnRN: (fn: () => void) => fn(),
    executeOnUIRuntimeSync: identity,
    serializableMappingCache: new WeakMap(),
    RuntimeKind: { ReactNative: 1, UI: 2, Worker: 3 },
    WorkletsModule: { installValueUnpacker: jest.fn() },
  };
});

jest.mock("@invertase/react-native-apple-authentication", () => ({
  __esModule: true,
  default: { performRequest: jest.fn(), getCredentialStateForUser: jest.fn() },
  appleAuth: { performRequest: jest.fn() },
}));

jest.mock("react-native-share", () => ({
  __esModule: true,
  default: { open: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock("react-native-haptic-feedback", () => ({
  __esModule: true,
  default: { trigger: jest.fn() },
  trigger: jest.fn(),
}));

jest.mock("@react-native-clipboard/clipboard", () =>
  require("@react-native-clipboard/clipboard/jest/clipboard-mock.js")
);

jest.mock("react-native-webview", () => {
  const { View } = require("react-native");
  return { WebView: View, default: View };
});

jest.mock("@react-native-documents/picker", () => ({
  pick: jest.fn().mockResolvedValue([]),
  types: { allFiles: "public.item" },
  isErrorWithCode: () => false,
  errorCodes: {},
}));

jest.mock("react-native-appsflyer", () => ({
  __esModule: true,
  default: {
    initSdk: jest.fn(),
    onInstallConversionData: jest.fn(() => jest.fn()),
    onAppOpenAttribution: jest.fn(() => jest.fn()),
    onDeepLink: jest.fn(() => jest.fn()),
    logEvent: jest.fn().mockResolvedValue(undefined),
    setCustomerUserId: jest.fn(),
    stop: jest.fn(),
  },
}));

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn().mockResolvedValue({ data: undefined }),
    signOut: jest.fn().mockResolvedValue(undefined),
  },
  statusCodes: {},
}));

jest.mock("react-native-nitro-modules", () => ({
  NitroModules: { createHybridObject: () => ({}), get: () => ({}) },
}));

jest.mock("@kingstinct/react-native-healthkit", () => ({
  __esModule: true,
  default: {},
  isHealthDataAvailable: () => false,
  requestAuthorization: jest.fn().mockResolvedValue(false),
  queryQuantitySamples: jest.fn().mockResolvedValue([]),
  queryCategorySamples: jest.fn().mockResolvedValue([]),
  CategoryValueSleepAnalysis: {
    inBed: 0,
    asleepUnspecified: 1,
    awake: 2,
    asleepCore: 3,
    asleepDeep: 4,
    asleepREM: 5,
  },
}));

jest.mock("rollbar-react-native", () => ({
  Client: class Client {
    public error = jest.fn();
    public warning = jest.fn();
    public info = jest.fn();
    public debug = jest.fn();
    public critical = jest.fn();
    public log = jest.fn();
    public setPerson = jest.fn();
  },
  Configuration: class Configuration {},
}));

jest.mock("react-native-keychain", () => ({
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
  ACCESSIBLE: { AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: "AfterFirstUnlockThisDeviceOnly" },
}));

jest.mock("@sayem314/react-native-keep-awake", () => ({
  activateKeepAwake: jest.fn(),
  deactivateKeepAwake: jest.fn(),
}));

// Every call to these has to go through env.timer / env.workout, so a refactor that reaches for
// the spec directly fails here instead of passing unnoticed.
const envOwnedModule = (name: string): unknown =>
  new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (typeof prop === "symbol" || prop === "then") {
          return undefined;
        }
        return () => {
          throw new Error(`${name}.${String(prop)}() was called directly; the render suite routes it through IEnv`);
        };
      },
    }
  );

const asyncNoop = (): Promise<undefined> => Promise.resolve(undefined);
const subscription = { remove: jest.fn() };
const turboModule = (extra: Record<string, unknown> = {}): unknown =>
  new Proxy(
    { ...extra },
    {
      get: (target, prop) => {
        if (prop in target) {
          return (target as Record<string | symbol, unknown>)[prop];
        }
        if (prop === "then") {
          return undefined;
        }
        return jest.fn(() => (String(prop).startsWith("on") ? subscription : asyncNoop()));
      },
    }
  );

jest.mock("../../src/specs/NativeLftUpdater", () => ({
  __esModule: true,
  default: turboModule({ activeBundleId: () => Promise.resolve(null), activeBundleIdSync: () => null }),
}));
jest.mock("../../src/specs/NativeLiftosaurEventReporter", () => ({ __esModule: true, default: turboModule() }));
jest.mock("../../src/specs/NativeLiftosaurImageResizer", () => ({ __esModule: true, default: turboModule() }));
jest.mock("../../src/specs/NativeLiftosaurLiveActivity", () => ({
  __esModule: true,
  default: envOwnedModule("NativeLiftosaurLiveActivity"),
}));
jest.mock("../../src/specs/NativeLiftosaurPush", () => ({ __esModule: true, default: turboModule() }));
jest.mock("../../src/specs/NativeLiftosaurShare", () => ({ __esModule: true, default: turboModule() }));
jest.mock("../../src/specs/NativeLiftosaurTimer", () => ({
  __esModule: true,
  default: envOwnedModule("NativeLiftosaurTimer"),
}));
jest.mock("../../src/specs/FastTextNativeComponent", () => {
  const { Text } = require("react-native");
  return { __esModule: true, default: Text };
});
jest.mock("../../src/specs/LiftoEditorNativeComponent", () => {
  const { View } = require("react-native");
  return { __esModule: true, default: View, Commands: { setValue: jest.fn(), focus: jest.fn(), blur: jest.fn() } };
});
jest.mock("../../src/specs/NativeLiftosaurProfiler", () => ({ __esModule: true, default: null }));
jest.mock("../../src/specs/NativeLiftosaurWatch", () => ({ __esModule: true, default: null }));
jest.mock("../../src/specs/NativeLiftosaurWorkoutMirroring", () => ({ __esModule: true, default: null }));

jest.mock("react-native-mmkv", () => {
  const stores = new Map<string, Map<string, unknown>>();
  const createMMKV = (config: { id?: string } = {}): unknown => {
    const id = config.id ?? "default";
    if (!stores.has(id)) {
      stores.set(id, new Map());
    }
    const store = stores.get(id)!;
    return {
      set: (k: string, v: unknown) => store.set(k, v),
      getString: (k: string) => store.get(k) as string | undefined,
      getNumber: (k: string) => store.get(k) as number | undefined,
      getBoolean: (k: string) => store.get(k) as boolean | undefined,
      contains: (k: string) => store.has(k),
      delete: (k: string) => store.delete(k),
      remove: (k: string) => store.delete(k),
      getAllKeys: () => Array.from(store.keys()),
      clearAll: () => store.clear(),
    };
  };
  return {
    createMMKV,
    MMKV: function MMKV(config: { id?: string } = {}) {
      return createMMKV(config);
    },
  };
});

jest.mock("react-native-fs", () => ({
  DocumentDirectoryPath: "/tmp/liftosaur-test",
  exists: jest.fn().mockResolvedValue(false),
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(""),
  unlink: jest.fn().mockResolvedValue(undefined),
  readDir: jest.fn().mockResolvedValue([]),
}));
