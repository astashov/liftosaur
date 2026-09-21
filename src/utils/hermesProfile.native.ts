import NativeLiftosaurProfiler from "../specs/NativeLiftosaurProfiler";
import { lg } from "./posthog";

declare const __PERF__: boolean | undefined;

let isRunning = false;
const captured = new Set<string>();

// Babel inlines __PERF__ as a literal, so outside a PERF=1 build this returns before any work.
export function HermesProfile_captureOnce(label: string, sampleMs: number = 1500): void {
  if (typeof __PERF__ === "undefined" || __PERF__ !== true) {
    return;
  }
  const profiler = NativeLiftosaurProfiler;
  if (profiler == null || isRunning || captured.has(label)) {
    return;
  }
  isRunning = true;
  captured.add(label);
  profiler.enable();
  setTimeout(() => {
    profiler.disable();
    try {
      const path = profiler.dumpToFile(`liftosaur-${label}.cpuprofile`);
      lg("perf-hermes-profile", { path, label });
    } catch (e) {
      lg("perf-hermes-profile-error", { error: String(e) });
    }
    isRunning = false;
  }, sampleMs);
}
