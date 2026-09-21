/* eslint-disable @typescript-eslint/naming-convention */
import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
  enable(): void;
  disable(): void;
  dumpToFile(filename: string): string;
}

// Not `getEnforcing`: only Android implements this, and it exists for profiling runs, not for users.
export default TurboModuleRegistry.get<Spec>("LiftosaurProfiler");
