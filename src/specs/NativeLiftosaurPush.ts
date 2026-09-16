/* eslint-disable @typescript-eslint/naming-convention */
import type { TurboModule } from "react-native";
import type { EventEmitter } from "react-native/Libraries/Types/CodegenTypes";
import { TurboModuleRegistry } from "react-native";

export type LiftosaurPushTokenEvent = {
  token: string;
};

export type LiftosaurPushEvent = {
  reason: string;
  originalId: string;
  deliveryId: string;
};

export interface Spec extends TurboModule {
  start(): Promise<void>;
  flushPending(): Promise<void>;
  complete(deliveryId: string, newData: boolean): Promise<void>;

  readonly onToken: EventEmitter<LiftosaurPushTokenEvent>;
  readonly onPush: EventEmitter<LiftosaurPushEvent>;
}

export default TurboModuleRegistry.getEnforcing<Spec>("LiftosaurPush");
