export type IWorkoutSetRowTransitionPhase = "idle" | "leaving" | "swapped" | "resizing";

export interface IWorkoutSetRowTransition {
  phase: IWorkoutSetRowTransitionPhase;
  shownExpanded: boolean;
  leavingExpanded: boolean | undefined;
  targetExpanded: boolean;
  fromHeight: number;
  keepsLeavingCopy: boolean;
}

export type IWorkoutSetRowTransitionEvent =
  | { kind: "target"; expanded: boolean; currentHeight: number }
  | { kind: "overlayMounted" }
  | { kind: "measured"; height: number }
  | { kind: "finished"; height: number };

export type IWorkoutSetRowTransitionEffect =
  | { kind: "hold"; height: number }
  | { kind: "swap" }
  | { kind: "resize"; from: number; to: number }
  | { kind: "settle"; height: number }
  | { kind: "follow"; height: number };

export interface IWorkoutSetRowTransitionStep {
  state: IWorkoutSetRowTransition;
  effects: IWorkoutSetRowTransitionEffect[];
}

export function WorkoutSetRowTransition_initial(
  expanded: boolean,
  keepsLeavingCopy: boolean
): IWorkoutSetRowTransition {
  return {
    phase: "idle",
    shownExpanded: expanded,
    leavingExpanded: undefined,
    targetExpanded: expanded,
    fromHeight: 0,
    keepsLeavingCopy,
  };
}

function start(state: IWorkoutSetRowTransition, expanded: boolean, fromHeight: number): IWorkoutSetRowTransitionStep {
  if (state.keepsLeavingCopy) {
    return {
      state: { ...state, phase: "leaving", leavingExpanded: state.shownExpanded, targetExpanded: expanded, fromHeight },
      effects: [{ kind: "hold", height: fromHeight }],
    };
  }
  return {
    state: {
      ...state,
      phase: "swapped",
      shownExpanded: expanded,
      leavingExpanded: undefined,
      targetExpanded: expanded,
      fromHeight,
    },
    effects: [{ kind: "hold", height: fromHeight }, { kind: "swap" }],
  };
}

export function WorkoutSetRowTransition_step(
  state: IWorkoutSetRowTransition,
  event: IWorkoutSetRowTransitionEvent
): IWorkoutSetRowTransitionStep {
  switch (event.kind) {
    case "target": {
      if (event.expanded === state.targetExpanded) {
        return { state, effects: [] };
      }
      if (state.phase === "idle") {
        return start(state, event.expanded, event.currentHeight);
      }
      return { state: { ...state, targetExpanded: event.expanded }, effects: [] };
    }
    case "overlayMounted": {
      if (state.phase !== "leaving") {
        return { state, effects: [] };
      }
      return {
        state: { ...state, phase: "swapped", shownExpanded: state.targetExpanded },
        effects: [{ kind: "swap" }],
      };
    }
    case "measured": {
      if (state.phase === "idle") {
        return { state, effects: [{ kind: "follow", height: event.height }] };
      }
      if (state.phase !== "swapped") {
        return { state, effects: [] };
      }
      return {
        state: { ...state, phase: "resizing" },
        effects: [{ kind: "resize", from: state.fromHeight, to: event.height }],
      };
    }
    case "finished": {
      if (state.phase !== "resizing") {
        return { state, effects: [] };
      }
      const settled: IWorkoutSetRowTransition = { ...state, phase: "idle", leavingExpanded: undefined };
      if (state.targetExpanded !== state.shownExpanded) {
        return start(settled, state.targetExpanded, event.height);
      }
      return { state: settled, effects: [{ kind: "settle", height: event.height }] };
    }
  }
}
