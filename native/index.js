/**
 * @format
 */

const { main, api, streamingapi, port = 8080, apiPort = 3000, streamingApiPort = 3001 } = require("../localdomain");

if (__DEV__) {
  const originalLog = console.log;
  console.log = (...args) => {
    originalLog(`[${new Date().toISOString().slice(11, 23)}]`, ...args);
  };
  globalThis.__HOST__ = `https://${main}.liftosaur.com:${port}`;
  globalThis.__API_HOST__ = `https://${api}.liftosaur.com:${apiPort}`;
  globalThis.__STREAMING_API_HOST__ = `https://${streamingapi}.liftosaur.com:${streamingApiPort}`;
  globalThis.__ENV__ = "development";
} else {
  globalThis.__HOST__ = "https://www.liftosaur.com";
  globalThis.__API_HOST__ = "https://api3.liftosaur.com";
  globalThis.__STREAMING_API_HOST__ = "https://streaming-api.liftosaur.com";
  globalThis.__ENV__ = "production";
}
globalThis.__COMMIT_HASH__ = "native";

import { AppRegistry } from "react-native";
import App from "./App";
import { name as appName } from "./app.json";

AppRegistry.registerComponent(appName, () => App);
