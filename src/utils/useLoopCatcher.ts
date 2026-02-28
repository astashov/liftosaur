import { useRef } from "preact/hooks";
import { DateUtils_formatHHMMSS } from "./date";

export function useLoopCatcher(): void {
  const counter = useRef<Partial<Record<string, number>>>({});
  const hhmmss = DateUtils_formatHHMMSS(Date.now());
  counter.current[hhmmss] = (counter.current[hhmmss] || 0) + 1;
  if ((counter.current[hhmmss] || 0) > 300) {
    throw new Error("Loop detected");
  }
  const keys = Object.keys(counter.current).sort();
  for (const key of keys.slice(0, keys.length - 10)) {
    delete counter.current[key];
  }
}
