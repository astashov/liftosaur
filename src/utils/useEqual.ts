import { useRef } from "react";
import { ObjectUtils_isEqual } from "./object";

export function useEqual<T>(value: T): T {
  const ref = useRef<T>(value);
  if (
    ref.current !== value &&
    !ObjectUtils_isEqual(ref.current as unknown as Record<string, unknown>, value as unknown as Record<string, unknown>)
  ) {
    ref.current = value;
  }
  return ref.current;
}
