import { Platform } from "react-native";
import { Service } from "../api/service";
import { AudioInterface } from "../lib/audioInterface";
import { IEnv } from "../models/state";
import { navigationRef } from "../navigation/navigationRef";
import { getCurrentScreenData } from "../navigation/navigationService";
import NativeLiftosaurPush from "../specs/NativeLiftosaurPush";
import { AsyncQueue } from "./asyncQueue";
import { HealthAdapter } from "./health";
import { IapAdapter } from "./iap";
import { Keychain } from "./keychainStore";
import { TimerBridge } from "./nativeTimerBridge";
import { WatchBridge } from "./nativeWatchBridge";
import { WorkoutBridge } from "./nativeWorkoutBridge";
import { WorkoutMirroring } from "./nativeWorkoutMirroringBridge";
import { Persistence } from "./persistence";
import { PushSyncClient } from "./pushSyncClient";

export function AppEnv_build(persistence: Persistence): IEnv {
  const service = new Service(fetch);
  const timer = new TimerBridge();
  const mirroring = new WorkoutMirroring();
  return {
    service,
    audio: new AudioInterface(timer),
    queue: new AsyncQueue(),
    persistence,
    navigationRef,
    getCurrentScreenData,
    iap: new IapAdapter(),
    health: new HealthAdapter(),
    push: new PushSyncClient(service, NativeLiftosaurPush, Platform.OS === "ios" ? "ios" : "android"),
    timer,
    mirroring,
    workout: new WorkoutBridge(timer, mirroring),
    watch: new WatchBridge(),
    keychain: new Keychain(),
  };
}
