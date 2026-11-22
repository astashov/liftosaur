import { ISet, ISettings } from "../types";

export function RestTimer_forSet(
  set: ISet | undefined,
  mode: "warmup" | "workout",
  isSuperset: boolean,
  settings: ISettings
): number | undefined {
  if (set?.timer != null) {
    return set.timer;
  }
  if (mode === "workout" && isSuperset && settings.timers.superset != null) {
    return settings.timers.superset;
  }
  return settings.timers[mode] ?? undefined;
}
