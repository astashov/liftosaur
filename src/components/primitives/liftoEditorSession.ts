import {
  IEditorToken,
  IEditorTokenNumeric,
  ILiftoEditorContext,
  ILiftoEditorStyledRange,
  ITextEdit,
  LiftoEditorBrain_contextAt,
  LiftoEditorBrain_stepToken,
  LiftoEditorBrain_tokens,
} from "./liftoEditorBrain";
import { ILiftoEditorPill } from "./liftoEditorActions";
import { Weight_build, Weight_decrement, Weight_increment } from "../../models/weight";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { IExerciseType, ISettings, IUnit } from "../../types";

// The structured-editing interaction state machine, pure by construction: every user
// gesture is a `(session, input) -> { session, effects }` transition. Timestamps and
// settings come in as arguments; effects DESCRIBE what the imperative shell (the
// useLiftoEditorController hook) must do — text edits to send to the native editor,
// keypad open/close — and are never performed here.

export type ILiftoEditorMode = "structured" | "freeform";

export interface IActiveNumber {
  // Discriminant for future non-numeric keypad sessions (e.g. an IActiveText).
  type: "number";
  // The token as it was at activation; its start stays valid while the keypad is open.
  token: IEditorToken;
  // token.numeric, non-optional by construction (only numeric tokens activate).
  numeric: IEditorTokenNumeric;
  // Live span length — typing grows/shrinks the token in place.
  length: number;
  buffer: string;
  suffix: string;
  // The first digit after focusing replaces the value (type-to-replace), the rest append.
  fresh: boolean;
}

export interface ILiftoEditorSession {
  mode: ILiftoEditorMode;
  text: string;
  // The breadcrumb stack at the anchor; undefined = nothing focused.
  context: ILiftoEditorContext | undefined;
  // Active breadcrumb level; undefined = innermost.
  focusLevel: number | undefined;
  // The position "where the user is" — the re-query point for context after every edit.
  anchor: number | undefined;
  // The focused token: re-tap detection, ‹ › reference point, snap target for edits.
  focusedToken: IEditorToken | undefined;
  // Keypad editing session; non-null means the keypad is (or should be) open.
  active: IActiveNumber | undefined;
  lastTapTime: number;
  // Caret to place once the freeform render commits editable on the native side.
  pendingCaret: number | undefined;
}

export interface ILiftoEditorSessionEffects {
  edits?: ITextEdit[];
  keypad?: "open" | "close";
}

export interface ILiftoEditorSessionResult {
  session: ILiftoEditorSession;
  effects: ILiftoEditorSessionEffects;
}

export function LiftoEditorSession_create(text: string): ILiftoEditorSession {
  return {
    mode: "structured",
    text,
    context: undefined,
    focusLevel: undefined,
    anchor: undefined,
    focusedToken: undefined,
    active: undefined,
    lastTapTime: 0,
    pendingCaret: undefined,
  };
}

function parseToken(token: IEditorToken): IActiveNumber | undefined {
  if (token.numeric == null) {
    return undefined;
  }
  const match = token.text.match(/^([+-]?\d+(?:\.\d+)?)(.*)$/);
  if (match == null) {
    return undefined;
  }
  return {
    type: "number",
    token,
    numeric: token.numeric,
    length: token.text.length,
    buffer: match[1],
    suffix: match[2],
    fresh: true,
  };
}

function currentAnchor(session: ILiftoEditorSession): number | undefined {
  const active = session.active;
  return active != null ? Math.min(active.token.start + 1, active.token.start + active.length) : session.anchor;
}

function focusedLevelIndex(session: ILiftoEditorSession): number | undefined {
  const ctx = session.context;
  if (ctx == null || ctx.levels.length === 0) {
    return undefined;
  }
  return session.focusLevel != null ? Math.min(session.focusLevel, ctx.levels.length - 1) : ctx.levels.length - 1;
}

// Applies the buffer to the active token's span: the edit to send, and the active with its
// live length updated. Empty/lone-minus buffers render as "0" so the token stays parseable.
function bufferEdit(active: IActiveNumber): { active: IActiveNumber; edit: ITextEdit } {
  const tokenText = `${active.buffer === "" || active.buffer === "-" ? "0" : active.buffer}${active.suffix}`;
  return {
    active: { ...active, length: tokenText.length },
    edit: { start: active.token.start, end: active.token.start + active.length, text: tokenText },
  };
}

// Rebuild the keypad config after weight edits so addons that depend on the value (plates
// readout) update; other kinds keep the keypad as-is.
function bufferResult(session: ILiftoEditorSession, active: IActiveNumber): ILiftoEditorSessionResult {
  const applied = bufferEdit(active);
  return {
    session: { ...session, active: applied.active },
    effects: { edits: [applied.edit], keypad: applied.active.numeric.kind === "weight" ? "open" : undefined },
  };
}

function activateToken(session: ILiftoEditorSession, token: IEditorToken): ILiftoEditorSessionResult {
  const parsed = parseToken(token);
  if (parsed == null) {
    return { session, effects: {} };
  }
  const anchor = Math.min(token.start + 1, token.end);
  return {
    session: {
      ...session,
      active: parsed,
      anchor,
      focusedToken: token,
      context: LiftoEditorBrain_contextAt(session.text, anchor),
      focusLevel: undefined,
    },
    effects: { keypad: "open" },
  };
}

export function LiftoEditorSession_tap(
  session: ILiftoEditorSession,
  index: number,
  now: number
): ILiftoEditorSessionResult {
  // Double-tapping the already-focused token drills past structured mode into freeform,
  // with the caret landing where the finger did. A slow re-tap just keeps the focus —
  // accidental second taps shouldn't yank the user into text editing.
  const sinceLastTap = now - session.lastTapTime;
  const tapped: ILiftoEditorSession = { ...session, lastTapTime: now };
  const focused = session.focusedToken;
  if (focused != null && index >= focused.start && index <= focused.end) {
    if (sinceLastTap < 300) {
      const result = LiftoEditorSession_switchToFreeform(tapped);
      return { ...result, session: { ...result.session, pendingCaret: index } };
    }
    // Keypad open: the slow re-tap shouldn't reset the typed buffer. Otherwise fall
    // through so a re-tap on a numeric token whose keypad was closed reopens it.
    if (session.active != null) {
      return { session: tapped, effects: {} };
    }
  }
  const tokens = LiftoEditorBrain_tokens(session.text);
  const numericToken = tokens.find((t) => t.numeric != null && index >= t.start && index <= t.end);
  if (numericToken != null) {
    return activateToken(tapped, numericToken);
  }
  return {
    session: {
      ...tapped,
      active: undefined,
      anchor: index,
      focusedToken: tokens.find((t) => t.walkStop && index >= t.start && index <= t.end),
      context: LiftoEditorBrain_contextAt(session.text, index),
      focusLevel: undefined,
    },
    effects: { keypad: "close" },
  };
}

export function LiftoEditorSession_walkFocus(
  session: ILiftoEditorSession,
  direction: 1 | -1
): ILiftoEditorSessionResult {
  const tokens = LiftoEditorBrain_tokens(session.text).filter((t) => t.walkStop);
  if (tokens.length === 0) {
    return { session, effects: {} };
  }
  // The reference point is the start of whatever is focused now; › goes to the first
  // token strictly after it, ‹ strictly before. The focused token must win over the
  // level — a level can start before its focused token (`warmup: none` focuses `none`
  // but the property level starts at `warmup`), and using the level start would make
  // › land on the current token again.
  const levelIndex = focusedLevelIndex(session);
  const current =
    session.active?.token.start ??
    session.focusedToken?.start ??
    (session.context != null && levelIndex != null ? session.context.levels[levelIndex]?.start : undefined) ??
    session.anchor ??
    -1;
  let next: IEditorToken | undefined;
  if (direction > 0) {
    next = tokens.find((t) => t.start > current) ?? tokens[0];
  } else {
    next = [...tokens].reverse().find((t) => t.start < current) ?? tokens[tokens.length - 1];
  }
  if (next.numeric != null) {
    return activateToken(session, next);
  }
  const anchor = Math.min(next.start + 1, next.end);
  return {
    session: {
      ...session,
      active: undefined,
      anchor,
      focusedToken: next,
      context: LiftoEditorBrain_contextAt(session.text, anchor),
      focusLevel: undefined,
    },
    effects: { keypad: "close" },
  };
}

export function LiftoEditorSession_selectLevel(session: ILiftoEditorSession, index: number): ILiftoEditorSessionResult {
  const ctx = session.context;
  if (ctx == null || ctx.levels[index] == null) {
    return { session, effects: {} };
  }
  // Zooming out past the number closes its keypad.
  if (index < ctx.levels.length - 1 && session.active != null) {
    return { session: { ...session, active: undefined, focusLevel: index }, effects: { keypad: "close" } };
  }
  return { session: { ...session, focusLevel: index }, effects: {} };
}

export function LiftoEditorSession_keypadInput(session: ILiftoEditorSession, key: string): ILiftoEditorSessionResult {
  const active = session.active;
  if (active == null) {
    return { session, effects: {} };
  }
  let buffer = active.buffer;
  if (key === "⌫") {
    buffer = buffer.slice(0, -1);
  } else if (key === ".") {
    if (!buffer.includes(".")) {
      buffer = buffer === "" ? "0." : `${buffer}.`;
    }
  } else if (/^\d$/.test(key)) {
    buffer = active.fresh ? key : `${buffer}${key}`;
  } else {
    return { session, effects: {} };
  }
  return bufferResult(session, { ...active, buffer, fresh: false });
}

export function LiftoEditorSession_setUnit(session: ILiftoEditorSession, unit: IUnit): ILiftoEditorSessionResult {
  const active = session.active;
  if (active == null) {
    return { session, effects: {} };
  }
  return bufferResult(session, { ...active, suffix: unit });
}

// The 1RM-calculator result: the keypad was closed for the modal, so always reopen it.
export function LiftoEditorSession_setBufferValue(
  session: ILiftoEditorSession,
  value: number
): ILiftoEditorSessionResult {
  const active = session.active;
  if (active == null) {
    return { session, effects: {} };
  }
  const result = bufferResult(session, { ...active, buffer: `${value}`, fresh: false });
  return { ...result, effects: { ...result.effects, keypad: "open" } };
}

export function LiftoEditorSession_step(
  session: ILiftoEditorSession,
  direction: 1 | -1,
  settings: ISettings,
  exerciseType: IExerciseType
): ILiftoEditorSessionResult {
  const active = session.active;
  if (active == null) {
    return { session, effects: {} };
  }
  // Set-section weights are real lifted loads — step through equipment settings (plates,
  // fixed weights). Function-arg and script weights are increments and step a plain unit.
  if (active.numeric.kind === "weight" && !active.numeric.inFunctionArgs) {
    const value = parseFloat(active.buffer === "" || active.buffer === "-" ? "0" : active.buffer);
    const unit: IUnit = active.suffix === "kg" ? "kg" : "lb";
    const stepFn = direction > 0 ? Weight_increment : Weight_decrement;
    const next = stepFn(Weight_build(value, unit), settings, exerciseType);
    return bufferResult(session, { ...active, buffer: `${next.value}`, suffix: next.unit });
  }
  const tokenText = `${active.buffer}${active.suffix}`;
  const stepped = LiftoEditorBrain_stepToken(
    {
      start: active.token.start,
      end: active.token.start + active.length,
      text: tokenText,
      walkStop: active.token.walkStop,
      numeric: active.numeric,
    },
    direction
  );
  const match = stepped?.match(/^([+-]?\d+(?:\.\d+)?)(.*)$/);
  if (match == null) {
    return { session, effects: {} };
  }
  return bufferResult(session, { ...active, buffer: match[1], suffix: match[2] });
}

// Focus survives the edit (the rail should update in place, not vanish); anchor and
// focused token shift by the length delta when the edit lands before them, and the
// text-change transition recomputes the context at the shifted anchor. When the edit
// overlaps them (replace-style pills transform the very token that's focused), they snap
// to the replacement's extent so the context resolves inside the new text.
export function LiftoEditorSession_applyPill(
  session: ILiftoEditorSession,
  pill: ILiftoEditorPill
): ILiftoEditorSessionResult {
  const delta = pill.text.length - (pill.end - pill.start);
  let anchor = session.anchor;
  if (anchor != null) {
    if (pill.end <= anchor) {
      anchor = anchor + delta;
    } else if (pill.start < anchor) {
      anchor = pill.start;
    }
  }
  let focusedToken = session.focusedToken;
  if (focusedToken != null) {
    if (pill.end <= focusedToken.start) {
      focusedToken = { ...focusedToken, start: focusedToken.start + delta, end: focusedToken.end + delta };
    } else if (pill.start < focusedToken.end && pill.end > focusedToken.start) {
      // The old token is gone; only the span matters after a snap (re-tap and walking
      // re-derive tokens from fresh text), so a synthetic non-numeric token suffices.
      focusedToken = { start: pill.start, end: pill.start + pill.text.length, text: pill.text, walkStop: true };
    }
  }
  return {
    session: { ...session, active: undefined, anchor, focusedToken },
    effects: {
      edits: [{ start: pill.start, end: pill.end, text: pill.text }],
      keypad: session.active != null ? "close" : undefined,
    },
  };
}

export function LiftoEditorSession_removeFocused(session: ILiftoEditorSession): ILiftoEditorSessionResult {
  const levelIndex = focusedLevelIndex(session);
  const level = session.context != null && levelIndex != null ? session.context.levels[levelIndex] : undefined;
  if (level == null) {
    return { session, effects: {} };
  }
  const text = session.text;
  let start = level.start;
  let end = level.end;
  // A removed item takes a separator with it. For comma-list items (set groups, state
  // vars) a trailing comma wins — "3x8, 5x5" minus the first group must keep its
  // leading " / ". Everything else eats its leading " / " or ", ", so
  // "5x5 / 100kg / progress" minus the weight yields "5x5 / progress".
  const isCommaListItem = level.nodeName === "ExerciseSet" || level.nodeName === "KeyValue";
  let j = end;
  while (j < text.length && text[j] === " ") {
    j += 1;
  }
  if (isCommaListItem && text[j] === ",") {
    j += 1;
    while (j < text.length && text[j] === " ") {
      j += 1;
    }
    end = j;
  } else {
    let i = start - 1;
    while (i >= 0 && text[i] === " ") {
      i -= 1;
    }
    if (i >= 0 && (text[i] === "/" || text[i] === ",")) {
      i -= 1;
      while (i >= 0 && text[i] === " ") {
        i -= 1;
      }
      start = i + 1;
    }
  }
  return {
    session: { ...session, active: undefined, focusedToken: undefined, context: undefined, focusLevel: undefined },
    effects: { edits: [{ start, end, text: "" }], keypad: "close" },
  };
}

// The keypad's onBlur: dismissed by tapping elsewhere or the dismiss key.
export function LiftoEditorSession_deactivate(session: ILiftoEditorSession): ILiftoEditorSessionResult {
  return {
    session: { ...session, active: undefined, focusedToken: undefined },
    effects: { keypad: "close" },
  };
}

export function LiftoEditorSession_switchToFreeform(session: ILiftoEditorSession): ILiftoEditorSessionResult {
  return {
    session: {
      ...session,
      mode: "freeform",
      active: undefined,
      focusedToken: undefined,
      context: undefined,
      focusLevel: undefined,
    },
    effects: { keypad: "close" },
  };
}

export function LiftoEditorSession_switchToStructured(session: ILiftoEditorSession): ILiftoEditorSessionResult {
  return { session: { ...session, mode: "structured" }, effects: {} };
}

// The freeform caret can only be placed once the native side has committed `editable`; the
// shell consumes it in a post-render effect.
export function LiftoEditorSession_consumePendingCaret(session: ILiftoEditorSession): {
  session: ILiftoEditorSession;
  caret: number | undefined;
} {
  return { session: { ...session, pendingCaret: undefined }, caret: session.pendingCaret };
}

// The editor echoed a text change (structured edits round-trip through the native side;
// freeform typing lands here directly). Edits move offsets, so the context (and especially
// pill insert positions) must be recomputed from the current text — stale offsets would
// splice into the middle of tokens.
export function LiftoEditorSession_textChanged(session: ILiftoEditorSession, newText: string): ILiftoEditorSession {
  const next = { ...session, text: newText };
  if (session.context != null) {
    const anchor = currentAnchor(next);
    if (anchor != null) {
      return { ...next, context: LiftoEditorBrain_contextAt(newText, Math.min(anchor, newText.length)) };
    }
  }
  return next;
}

export function LiftoEditorSession_activeLevelIndex(session: ILiftoEditorSession): number {
  const levels = session.context?.levels ?? [];
  return session.focusLevel != null ? Math.min(session.focusLevel, levels.length - 1) : levels.length - 1;
}

export function LiftoEditorSession_pills(session: ILiftoEditorSession): ILiftoEditorPill[] {
  const levels = session.context?.levels ?? [];
  return levels[LiftoEditorSession_activeLevelIndex(session)]?.pills ?? [];
}

export function LiftoEditorSession_highlight(session: ILiftoEditorSession): ILiftoEditorStyledRange[] {
  const ranges: ILiftoEditorStyledRange[] = [];
  const levelIndex = focusedLevelIndex(session);
  const level = session.context != null && levelIndex != null ? session.context.levels[levelIndex] : undefined;
  if (level != null && level.end > level.start) {
    ranges.push({ start: level.start, end: level.end, backgroundColor: `${Tailwind_semantic().syntax.comment}33` });
  }
  const active = session.active;
  if (active != null) {
    ranges.push({
      start: active.token.start,
      end: active.token.start + active.length,
      backgroundColor: `${Tailwind_semantic().syntax.literal}33`,
    });
  }
  return ranges;
}
