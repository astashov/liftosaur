import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface Spec extends TurboModule {
  shareToIGStory(workoutImagePath: string, backgroundImagePath: string | null): Promise<void>;
  shareToIGFeed(workoutImagePath: string): Promise<void>;
  shareToTiktok(workoutImagePath: string): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>("LiftosaurShare");
