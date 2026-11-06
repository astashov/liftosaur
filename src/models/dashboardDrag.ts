import {
  DashboardDrop_at,
  DashboardDrop_cellOf,
  DashboardDrop_grabFraction,
  IDashboardDrop,
  IDashboardDropCell,
  IDashboardDropEdge,
  IDragPoint,
} from "./dashboardDrop";
import type { IDashboardEditRow } from "./dashboardEdit";

export interface IDashboardDragMeasure {
  origin: IDragPoint;
  cells: IDashboardDropCell[];
  scrollAtMeasure: number;
}

export interface IDashboardDragState {
  slotId: number;
  text: string;
  token: number;
  startAt: IDragPoint;
  at: IDragPoint;
  measure?: IDashboardDragMeasure;
  drop: IDashboardDrop;
}

export type IDashboardDragEvent =
  | { type: "start"; slotId: number; at: IDragPoint; text: string; token: number }
  | { type: "measured"; token: number; measure: IDashboardDragMeasure }
  | { type: "move"; at: IDragPoint; translation: IDragPoint }
  | { type: "scrolled" }
  | { type: "textChanged"; text: string }
  | { type: "end"; commit: boolean };

export type IDashboardDragEffect =
  | { type: "measure"; token: number }
  | { type: "scrollBegin"; y: number }
  | { type: "scrollMove"; dy: number; y: number }
  | { type: "scrollEnd" }
  | { type: "showGhost"; width: number; grab: IDragPoint }
  | { type: "present"; point: IDragPoint; hoverKey: string; isRejected: boolean }
  | { type: "clear" }
  | { type: "commit"; slotId: number; drop: IDashboardDrop };

export interface IDashboardDragContext {
  rows: IDashboardEditRow[];
  scrollY: number;
}

export interface IDashboardDragResult {
  state?: IDashboardDragState;
  effects: IDashboardDragEffect[];
}

export function DashboardDrag_hoverKey(rowKey: string, cellIndex?: number, edge?: IDashboardDropEdge): string {
  return `${rowKey}:${cellIndex ?? "line"}${edge != null ? `:${edge}` : ""}`;
}

function resolve(state: IDashboardDragState, context: IDashboardDragContext): IDashboardDragResult {
  const measure = state.measure;
  if (measure == null) {
    return { state, effects: [] };
  }
  const point = {
    x: state.at.x - measure.origin.x,
    y: state.at.y - measure.origin.y + (context.scrollY - measure.scrollAtMeasure),
  };
  const drop = DashboardDrop_at(context.rows, measure.cells, state.slotId, point);
  const hoverKey =
    drop.kind === "none" ? "" : DashboardDrag_hoverKey(drop.spot.rowKey, drop.spot.cellIndex, drop.spot.edge);
  return {
    state: { ...state, drop },
    effects: [{ type: "present", point, hoverKey, isRejected: drop.kind === "reject" }],
  };
}

function finish(state: IDashboardDragState, commit: boolean): IDashboardDragResult {
  const isCommitted = commit && state.measure != null && state.drop.kind !== "none";
  return {
    state: undefined,
    effects: [
      { type: "scrollEnd" },
      { type: "clear" },
      ...(isCommitted ? [{ type: "commit" as const, slotId: state.slotId, drop: state.drop }] : []),
    ],
  };
}

export function DashboardDrag_transition(
  state: IDashboardDragState | undefined,
  event: IDashboardDragEvent,
  context: IDashboardDragContext
): IDashboardDragResult {
  if (event.type === "start") {
    const next: IDashboardDragState = {
      slotId: event.slotId,
      text: event.text,
      token: event.token,
      startAt: event.at,
      at: event.at,
      drop: { kind: "none" },
    };
    const reset: IDashboardDragEffect[] = state != null ? [{ type: "scrollEnd" }, { type: "clear" }] : [];
    return {
      state: next,
      effects: [...reset, { type: "scrollBegin", y: event.at.y }, { type: "measure", token: event.token }],
    };
  }
  if (state == null) {
    return { state, effects: [] };
  }
  switch (event.type) {
    case "measured": {
      if (event.token !== state.token) {
        return { state, effects: [] };
      }
      const measured = { ...state, measure: event.measure };
      const own = DashboardDrop_cellOf(context.rows, event.measure.cells, state.slotId);
      const startPoint = { x: state.startAt.x - event.measure.origin.x, y: state.startAt.y - event.measure.origin.y };
      const ghost: IDashboardDragEffect[] =
        own != null ? [{ type: "showGhost", width: own.width, grab: DashboardDrop_grabFraction(startPoint, own) }] : [];
      const resolved = resolve(measured, context);
      return { state: resolved.state, effects: [...ghost, ...resolved.effects] };
    }
    case "move": {
      const resolved = resolve({ ...state, at: event.at }, context);
      return {
        state: resolved.state,
        effects: [{ type: "scrollMove", dy: event.translation.y, y: event.at.y }, ...resolved.effects],
      };
    }
    case "scrolled":
      return resolve(state, context);
    case "textChanged":
      return event.text === state.text ? { state, effects: [] } : finish(state, false);
    case "end":
      return finish(state, event.commit);
  }
}
