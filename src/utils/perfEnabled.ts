declare let __DEV__: boolean;
declare const __PERF__: boolean | undefined;

export function PerfEnabled_isEnabled(): boolean {
  if (__DEV__) {
    return true;
  }
  return typeof __PERF__ !== "undefined" && __PERF__ === true;
}
