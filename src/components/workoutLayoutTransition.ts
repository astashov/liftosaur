import { Platform } from "react-native";
import { Easing, FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";

const DURATION_MS = 220;

// Every block below a set row needs it too, or it jumps to its final place while the rows slide.
// Native only: web renders the set menu as an inline dropdown that a clipped row would hide.
export const WorkoutLayoutTransition =
  Platform.OS === "web" ? undefined : LinearTransition.duration(DURATION_MS).easing(Easing.linear);

export const WorkoutLayoutClip = Platform.OS === "web" ? undefined : ({ overflow: "hidden" } as const);

export const WorkoutBodyEntering =
  Platform.OS === "web" ? undefined : FadeIn.duration(DURATION_MS).easing(Easing.linear);

export const WorkoutBodyExiting =
  Platform.OS === "web" ? undefined : FadeOut.duration(DURATION_MS).easing(Easing.linear);
