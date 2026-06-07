/* eslint-disable @typescript-eslint/naming-convention */
import type { TurboModule } from "react-native";
import type { EventEmitter } from "react-native/Libraries/Types/CodegenTypes";
import { TurboModuleRegistry } from "react-native";

export type LiftosaurTerminationInfo = {
  reason: string;
  timestamp: number;
  extra: { [key: string]: string };
};

export type LiftosaurTelemetryEvent = {
  name: string;
  timestamp: number;
  extra: { [key: string]: string };
};

export interface Spec extends TurboModule {
  getLastTerminationInfo(): Promise<LiftosaurTerminationInfo | null>;
  flushPendingTelemetry(): Promise<void>;
  getAppVersion(): string;

  readonly onTelemetryEvent: EventEmitter<LiftosaurTelemetryEvent>;
}

export default TurboModuleRegistry.getEnforcing<Spec>("LiftosaurEventReporter");
