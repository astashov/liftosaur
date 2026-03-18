import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface Spec extends TurboModule {
  reparent(childNativeID: string, newParentNativeID: string): Promise<boolean>;
  dumpViewHierarchy(): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>("WebViewReparenter");
