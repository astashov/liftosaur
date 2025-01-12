/* eslint-disable @typescript-eslint/naming-convention */
import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
  showKeyboard: (inputTag: number | null) => void;
}

export default TurboModuleRegistry.getEnforcing<Spec>("NativeNumKeyboard");
