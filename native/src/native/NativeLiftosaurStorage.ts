import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface Spec extends TurboModule {
  getValue(key: string): Promise<string | null>;
  setValue(key: string, value: string): Promise<boolean>;
  deleteValue(key: string): Promise<boolean>;
  hasValue(key: string): Promise<boolean>;
  getAllKeys(): Promise<string[]>;
  readFile(path: string): Promise<string | null>;
}

export default TurboModuleRegistry.getEnforcing<Spec>("LiftosaurStorage");
