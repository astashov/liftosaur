export type IPerfEvent =
  | { type: "nav"; session: string; from?: string; to: string; tap_ts: number }
  | { type: "longtask"; session: string; duration: number; start: number; screen?: string }
  | {
      type: "framedrop";
      session: string;
      thread: "ui" | "js";
      gap_ms: number;
      expected_ms: number;
      screen?: string;
      ts: number;
    }
  | { type: "session_start"; session: string; ts: number; platform: string; build: string }
  | {
      type: "mark";
      session: string;
      screen: string;
      phase: "mount" | "commit" | "interactive" | "loaded";
      ts: number;
      loaded_source?: "auto" | "explicit";
    }
  | {
      type: "render_count";
      session: string;
      component: string;
      delta: number;
      total: number;
      window_ms: number;
      ts: number;
    }
  | {
      type: "memo_timing";
      session: string;
      label: string;
      duration_ms: number;
      ts: number;
    }
  | {
      type: "scroll_start" | "scroll_end";
      session: string;
      screen?: string;
      label?: string;
      ts: number;
    }
  | {
      type: "action";
      session: string;
      action: string;
      desc?: string;
      ts: number;
    }
  | {
      type: "render_trace";
      session: string;
      component: string;
      ts: number;
    }
  | {
      type: "profile";
      session: string;
      id: string;
      phase: "mount" | "update" | "nested-update";
      actual_ms: number;
      base_ms: number;
      ts: number;
    };

export function PerfTracker_mark(_name: string, _screen?: string): void {}
export function PerfTracker_recordEvent(_event: IPerfEvent): void {}
export function PerfTracker_getSessionId(): string {
  return "noop";
}
export function PerfTracker_flush(): Promise<void> {
  return Promise.resolve();
}
export function PerfTracker_getRecent(_n: number): IPerfEvent[] {
  return [];
}
