import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

export interface ICheckAndDownloadResult {
  status: string;
  updateId?: string;
  error?: string;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface Spec extends TurboModule {
  checkAndDownload(): Promise<ICheckAndDownloadResult>;
  markLaunchSuccessful(): Promise<void>;
  activeBundleId(): Promise<string | null>;
  revertToEmbedded(): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>("LftUpdater");
