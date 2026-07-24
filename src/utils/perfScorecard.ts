import type { IPerfFrameWindow, IPerfRecentAction } from "./perfTracker";

export function PerfScorecard_setContextProvider(_provider: () => Record<string, number>): void {}
export function PerfScorecard_recordFrameWindow(_window: IPerfFrameWindow): void {}
export function PerfScorecard_recordLongTask(
  _durationMs: number,
  _screen: string | undefined,
  _recent?: IPerfRecentAction[]
): void {}
export function PerfScorecard_recordAction(_label: string, _durationMs: number): void {}
export function PerfScorecard_flush(): void {}
export function PerfScorecard_onScreenChange(_screen: string | undefined): void {}
