import type { IPerfFrameWindow } from "./perfTracker";

export function PerfFrameSampler_flush(_screenOverride?: string): void {
  // no-op on web
}

export function usePerfFrameSampling(
  _active: boolean,
  _getCurrentScreen: () => string | undefined,
  _onWindow?: (window: IPerfFrameWindow) => void
): void {
  // no-op on web
}
