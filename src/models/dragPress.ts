export interface IDragPoint {
  x: number;
  y: number;
}

export const DragPress_longPressMs = 500;
const TOUCH_SCROLL_SLOP_PX = 8;
const MOUSE_DRAG_START_PX = 4;

export type IDragPressState =
  | { kind: "idle" }
  | { kind: "pressed"; start: IDragPoint; isMouse: boolean }
  | { kind: "dragging"; start: IDragPoint };

export type IDragPressEvent =
  | { type: "pointerDown"; at: IDragPoint; isMouse: boolean }
  | { type: "grant"; at: IDragPoint }
  | { type: "longPress" }
  | { type: "move"; at: IDragPoint }
  | { type: "release"; commit: boolean }
  | { type: "unmount" };

export type IDragPressEffect =
  | { type: "startTimer" }
  | { type: "cancelTimer" }
  | { type: "cursor"; value: string }
  | { type: "dragStart"; at: IDragPoint }
  | { type: "dragMove"; translation: IDragPoint; at: IDragPoint }
  | { type: "dragEnd"; commit: boolean }
  | { type: "tap" };

export interface IDragPressResult {
  state: IDragPressState;
  effects: IDragPressEffect[];
}

export const DragPress_idle: IDragPressState = { kind: "idle" };

function distance(a: IDragPoint, b: IDragPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function translation(start: IDragPoint, at: IDragPoint): IDragPoint {
  return { x: at.x - start.x, y: at.y - start.y };
}

function begin(start: IDragPoint): IDragPressResult {
  return {
    state: { kind: "dragging", start },
    effects: [
      { type: "cursor", value: "grabbing" },
      { type: "dragStart", at: start },
    ],
  };
}

export function DragPress_transition(state: IDragPressState, event: IDragPressEvent): IDragPressResult {
  switch (event.type) {
    case "pointerDown":
      return {
        state: { kind: "pressed", start: event.at, isMouse: event.isMouse },
        effects: [{ type: "cancelTimer" }],
      };
    case "grant": {
      if (state.kind === "dragging") {
        return { state, effects: [] };
      }
      const pressed = state.kind === "pressed" ? state : { kind: "pressed" as const, start: event.at, isMouse: false };
      if (!pressed.isMouse) {
        return { state: pressed, effects: [{ type: "startTimer" }] };
      }
      return distance(event.at, pressed.start) > MOUSE_DRAG_START_PX
        ? begin(pressed.start)
        : { state: pressed, effects: [] };
    }
    case "longPress":
      return state.kind === "pressed" && !state.isMouse ? begin(state.start) : { state, effects: [] };
    case "move": {
      if (state.kind === "dragging") {
        return {
          state,
          effects: [{ type: "dragMove", translation: translation(state.start, event.at), at: event.at }],
        };
      }
      if (state.kind !== "pressed") {
        return { state, effects: [] };
      }
      const travelled = distance(event.at, state.start);
      if (!state.isMouse) {
        return { state, effects: travelled > TOUCH_SCROLL_SLOP_PX ? [{ type: "cancelTimer" }] : [] };
      }
      if (travelled <= MOUSE_DRAG_START_PX) {
        return { state, effects: [] };
      }
      const started = begin(state.start);
      return {
        state: started.state,
        effects: [
          ...started.effects,
          { type: "dragMove", translation: translation(state.start, event.at), at: event.at },
        ],
      };
    }
    case "release":
      if (state.kind === "dragging") {
        return {
          state: DragPress_idle,
          effects: [{ type: "cancelTimer" }, { type: "cursor", value: "" }, { type: "dragEnd", commit: event.commit }],
        };
      }
      return {
        state: DragPress_idle,
        effects: [
          { type: "cancelTimer" },
          ...(event.commit && state.kind === "pressed" ? [{ type: "tap" as const }] : []),
        ],
      };
    case "unmount":
      return {
        state: DragPress_idle,
        effects: [
          { type: "cancelTimer" },
          ...(state.kind === "dragging" ? [{ type: "cursor" as const, value: "" }] : []),
        ],
      };
  }
}

export function DragPress_takesResponderOnMove(state: IDragPressState, at: IDragPoint): boolean {
  if (state.kind === "dragging") {
    return true;
  }
  return state.kind === "pressed" && state.isMouse && distance(at, state.start) > MOUSE_DRAG_START_PX;
}

export function DragPress_yieldsResponder(state: IDragPressState): boolean {
  return state.kind === "idle" || (state.kind === "pressed" && !state.isMouse);
}
