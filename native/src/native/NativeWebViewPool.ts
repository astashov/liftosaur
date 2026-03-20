import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
  setup(url: string, poolSize: number): void;
  acquire(): Promise<number>;
  attach(slotId: number, targetNativeID: string): Promise<boolean>;
  releaseSlot(slotId: number): void;
  injectJavaScript(slotId: number, js: string): void;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>("WebViewPool");
