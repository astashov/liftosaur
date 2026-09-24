import { FrameLoop_track } from "./frameLoop";

const g = globalThis as unknown as Record<string, unknown>;
g.__HOST__ = "https://www.liftosaur.com";
g.__API_HOST__ = "https://api3.liftosaur.com";
g.__ENV__ = "ios-rn";
g.__COMMIT_HASH__ = "test";
g.__FULL_COMMIT_HASH__ = "test";
g.__BUNDLE_VERSION_IOS__ = 1;
g.__BUNDLE_VERSION_ANDROID__ = 1;
g.__PERF__ = false;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const rn = require("react-native") as { Image: Record<string, unknown> };
rn.Image.prefetch = () => Promise.resolve(true);
rn.Image.getSize = () => undefined;

FrameLoop_track();
