import {
  IEditorToken,
  IEditorTokenNumeric,
  ILiftoEditorContext,
  ILiftoEditorStyledRange,
  ITextEdit,
  LiftoEditorBrain_contextAt,
  LiftoEditorBrain_enclosingSetGroup,
  LiftoEditorBrain_scriptReuseBody,
  LiftoEditorBrain_stepToken,
  LiftoEditorBrain_tokens,
  LiftoEditorParseCache,
} from "./liftoEditorBrain";
import { ILiftoEditorPill } from "./liftoEditorActions";
import { PlannerNodeName } from "../../pages/planner/plannerExerciseStyles";
import { PlannerDocument_descriptionAt } from "../../pages/planner/models/plannerDocument";
import { Weight_build, Weight_convertTo, Weight_decrement, Weight_increment, Weight_round } from "../../models/weight";
import { Exercise_onerm } from "../../models/exercise";
import { MathUtils_roundFloat } from "../../utils/math";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { IAllCustomExercises, IExerciseType, IPercentageUnit, ISettings, IUnit } from "../../types";
import {
  ICompletionResult,
  PlannerCompletions_at,
  PlannerCompletionsIndex,
} from "../../pages/planner/plannerCompletions";

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

// How much of the program the document holds — one exercise's declaration, or a whole day.
// Not about where the editor is embedded: a day is edited both inline on the Program screen
// and in its own sheet, and both want the same actions (see scopePills).
export type ILiftoEditorScope = "exercise" | "day";

export interface ILiftoEditorSession {
  mode: ILiftoEditorMode;
  scope: ILiftoEditorScope;
  text: string;
  // The parse cache this editing session owns. Shared by reference across derived sessions
  // (the spread copies it along) so every transition and the editor view hit the same trees,
  // and collected with the session when the editor closes. Mutable, but only as a memo —
  // it can never change what a transition returns.
  cache: LiftoEditorParseCache;
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
  lastTapIndex: number | undefined;
  // Caret to place once the freeform render commits editable on the native side. The *live*
  // freeform caret is deliberately not here: it's an echo of where the native text view put the
  // cursor, not a decision this state machine makes, and the controller owns it.
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

export function LiftoEditorSession_create(text: string, scope: ILiftoEditorScope = "exercise"): ILiftoEditorSession {
  return {
    mode: "structured",
    scope,
    text,
    cache: new LiftoEditorParseCache(),
    context: undefined,
    focusLevel: undefined,
    anchor: undefined,
    focusedToken: undefined,
    active: undefined,
    lastTapTime: 0,
    lastTapIndex: undefined,
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

// Rebuild the keypad config after weight/percentage edits so addons that depend on the
// value (plates readout, resolved weight) update; other kinds keep the keypad as-is.
function bufferResult(session: ILiftoEditorSession, active: IActiveNumber): ILiftoEditorSessionResult {
  const applied = bufferEdit(active);
  const kind = applied.active.numeric.kind;
  return {
    session: { ...session, active: applied.active },
    effects: { edits: [applied.edit], keypad: kind === "weight" || kind === "percentage" ? "open" : undefined },
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
      context: LiftoEditorBrain_contextAt(session.cache, session.text, anchor),
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
  // Double-tapping drills past structured mode into freeform, with the caret landing where
  // the finger did — anywhere in the text, not just on a token (script bodies and
  // punctuation produce no token at all). Two quick taps count as a double tap when they
  // land on the same token, or — in token-free space — within a couple of characters;
  // quick taps on two different tokens are fast navigation, not a double tap.
  const sinceLastTap = now - session.lastTapTime;
  const tapped: ILiftoEditorSession = { ...session, lastTapTime: now, lastTapIndex: index };
  const tokens = LiftoEditorBrain_tokens(session.cache, session.text);
  const tokenAt = (i: number): IEditorToken | undefined => tokens.find((t) => i >= t.start && i <= t.end);
  if (sinceLastTap < 300 && session.lastTapIndex != null) {
    const prevToken = tokenAt(session.lastTapIndex);
    const thisToken = tokenAt(index);
    const isSamePlace =
      prevToken != null || thisToken != null ? prevToken === thisToken : Math.abs(index - session.lastTapIndex) <= 3;
    if (isSamePlace) {
      const result = LiftoEditorSession_switchToFreeform(tapped);
      return { ...result, session: { ...result.session, pendingCaret: index } };
    }
  }
  const focused = session.focusedToken;
  if (focused != null && index >= focused.start && index <= focused.end && session.active != null) {
    // Keypad open: the slow re-tap shouldn't reset the typed buffer. Otherwise fall
    // through so a re-tap on a numeric token whose keypad was closed reopens it.
    // Still reported as "open" even though it already is: the keypad host dismisses itself
    // on any tap that didn't (re)open it, so staying silent here would close the keypad
    // under the finger — and the layout shift that follows is what makes the second tap of
    // a double tap miss, leaving no way to reach freeform from a focused number.
    return { session: tapped, effects: { keypad: "open" } };
  }
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
      context: LiftoEditorBrain_contextAt(session.cache, session.text, index),
      focusLevel: undefined,
    },
    effects: { keypad: "close" },
  };
}

export function LiftoEditorSession_walkFocus(
  session: ILiftoEditorSession,
  direction: 1 | -1
): ILiftoEditorSessionResult {
  const tokens = LiftoEditorBrain_tokens(session.cache, session.text).filter((t) => t.walkStop);
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
      context: LiftoEditorBrain_contextAt(session.cache, session.text, anchor),
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

// Warmup percentages resolve against the first work set's weight rather than the 1RM, so
// anything that reads a percentage as a load has to know it's looking at a warmup.
export function LiftoEditorSession_isInWarmup(session: ILiftoEditorSession): boolean {
  return session.context?.levels.some((l) => l.nodeName === PlannerNodeName.WarmupExerciseSets) ?? false;
}

export function LiftoEditorSession_setUnit(
  session: ILiftoEditorSession,
  unit: IUnit | IPercentageUnit,
  settings: ISettings,
  exerciseType: IExerciseType
): ILiftoEditorSessionResult {
  const active = session.active;
  if (active == null) {
    return { session, effects: {} };
  }
  const plus = active.suffix.endsWith("+") ? "+" : "";
  const currentUnit = active.suffix.startsWith("%") ? "%" : active.suffix.startsWith("kg") ? "kg" : "lb";
  if (unit === currentUnit) {
    return { session, effects: {} };
  }
  const value = parseFloat(active.buffer === "" || active.buffer === "-" ? "0" : active.buffer);
  const rm1 = Exercise_onerm(exerciseType, settings);
  // Only a real lifted load has a percentage of the 1RM that means the same thing. A warmup
  // percentage is of the first work set's weight; a function argument or a script number is
  // an increment (`lp(5%)` adds 5%, it doesn't set 5% of the 1RM); and an exercise nobody has
  // entered a 1RM for has no basis at all. In all three the unit still switches and the
  // number stays as typed, the same as kg <-> lb does everywhere — a unit button that
  // silently does nothing reads as a broken editor.
  const convertsThroughRm1 = rm1.value > 0 && !active.numeric.inFunctionArgs && !LiftoEditorSession_isInWarmup(session);
  let buffer = active.buffer;
  let kind = active.numeric.kind;
  // kg <-> lb keeps the raw value (matching the workout weight input); % conversions go
  // through the exercise's 1RM so the token keeps referring to the same lifted load.
  if (unit === "%") {
    if (convertsThroughRm1) {
      const weight = Weight_convertTo(Weight_build(value, currentUnit as IUnit), rm1.unit);
      buffer = `${MathUtils_roundFloat((weight.value / rm1.value) * 100, 2)}`;
    }
    kind = "percentage";
  } else if (currentUnit === "%") {
    if (convertsThroughRm1) {
      const weight = Weight_round(Weight_build((rm1.value * value) / 100, rm1.unit), settings, unit, exerciseType);
      buffer = `${Weight_convertTo(weight, unit).value}`;
    }
    kind = "weight";
  }
  return bufferResult(session, {
    ...active,
    buffer,
    suffix: `${unit}${plus}`,
    numeric: { ...active.numeric, kind },
  });
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
    // startsWith: WeightWithPlus tokens carry the "+" in the suffix ("kg+").
    const unit: IUnit = active.suffix.startsWith("kg") ? "kg" : "lb";
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
  // Multi-span pills ("Make current") carry extraEdits; all spans are disjoint and in
  // original-text coordinates. Walking them ascending keeps anchor/token bookkeeping in
  // sync (each iteration shifts the edit into already-applied coordinates).
  const edits = [{ start: pill.start, end: pill.end, text: pill.text }, ...(pill.extraEdits ?? [])].sort(
    (a, b) => a.start - b.start
  );
  let anchor = session.anchor;
  let focusedToken = session.focusedToken;
  let shift = 0;
  for (const edit of edits) {
    const start = edit.start + shift;
    const end = edit.end + shift;
    const delta = edit.text.length - (edit.end - edit.start);
    if (anchor != null) {
      if (end <= anchor) {
        anchor = anchor + delta;
      } else if (start < anchor) {
        anchor = start;
      }
    }
    if (focusedToken != null) {
      if (end <= focusedToken.start) {
        focusedToken = { ...focusedToken, start: focusedToken.start + delta, end: focusedToken.end + delta };
      } else if (start < focusedToken.end && end > focusedToken.start) {
        // The old token is gone; only the span matters after a snap (re-tap and walking
        // re-derive tokens from fresh text), so a synthetic non-numeric token suffices.
        focusedToken = { start, end: start + edit.text.length, text: edit.text, walkStop: true };
      }
    }
    shift += delta;
  }
  return {
    session: { ...session, active: undefined, anchor, focusedToken },
    effects: {
      // Descending so the sequential replaceRange calls don't invalidate later offsets.
      edits: [...edits].reverse(),
      keypad: session.active != null ? "close" : undefined,
    },
  };
}

export function LiftoEditorSession_removeFocused(session: ILiftoEditorSession): ILiftoEditorSessionResult {
  const levelIndex = focusedLevelIndex(session);
  const levels = session.context?.levels ?? [];
  const level = levelIndex != null ? levels[levelIndex] : undefined;
  if (level == null) {
    return { session, effects: {} };
  }
  const text = session.text;
  let nodeName = level.nodeName;
  let start = level.start;
  let end = level.end;
  const scriptBody = LiftoEditorBrain_scriptReuseBody(session.cache, text, level);
  if (scriptBody != null) {
    return {
      session: { ...session, active: undefined, focusedToken: undefined, context: undefined, focusLevel: undefined },
      effects: { edits: [{ start: scriptBody.start, end: scriptBody.end, text: "{~ ~}" }], keypad: "close" },
    };
  }
  // A description occupies whole lines rather than sitting inside one, so removing it is a
  // question about lines and the blank ones around them — which the document answers, the same
  // way it answers which runs are descriptions at all.
  if (nodeName === PlannerNodeName.LineComment) {
    const found = PlannerDocument_descriptionAt(text, start, session.cache.parse(text));
    const description = found != null ? found.siblings[found.index] : undefined;
    if (description == null) {
      return { session, effects: {} };
    }
    return {
      session: { ...session, active: undefined, focusedToken: undefined, context: undefined, focusLevel: undefined },
      effects: {
        edits: [{ start: description.removeFrom, end: description.removeTo, text: "" }],
        keypad: "close",
      },
    };
  }
  // Removing a group's sets×reps alone leaves nonsense ("warmup: 40%"; "3x8 100lb" minus
  // "3x8" reads as globals) — promote to the whole set group. And when a property's whole
  // value would go — its function ("id:" minus "tags(2)"), the last warmup group, or the
  // Warmup sets level itself — take the whole property: a dangling "name:" doesn't parse.
  const group = LiftoEditorBrain_enclosingSetGroup(session.cache, text, level);
  const removesPropertyValue =
    (group?.isOnlyGroup === true && group.nodeName === "WarmupExerciseSet") ||
    nodeName === "WarmupExerciseSets" ||
    nodeName === "FunctionExpression";
  const propertyLevel = removesPropertyValue
    ? levels
        .slice(0, levelIndex)
        .reverse()
        .find((l) => l.nodeName === "ExerciseProperty")
    : undefined;
  const target = propertyLevel ?? group;
  if (target != null) {
    nodeName = target.nodeName;
    start = target.start;
    end = target.end;
  }
  // A removed item takes a separator with it. For list items (set groups and state vars
  // separated by ",", exercise variations by "|") a trailing separator wins — "3x8, 5x5"
  // minus the first group must keep its leading " / ". Everything else eats its leading
  // " / " or ", ", so "5x5 / 100kg / progress" minus the weight yields "5x5 / progress".
  const isExerciseVariation = nodeName === "ExerciseVariation";
  const listSeparator =
    nodeName === "ExerciseSet" || nodeName === "WarmupExerciseSet" || nodeName === "KeyValue"
      ? ","
      : isExerciseVariation
        ? "|"
        : undefined;
  let j = end;
  while (j < text.length && text[j] === " ") {
    j += 1;
  }
  if (listSeparator != null && text[j] === listSeparator) {
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
    if (i >= 0 && (isExerciseVariation ? text[i] === "|" : text[i] === "/" || text[i] === ",")) {
      i -= 1;
      while (i >= 0 && text[i] === " ") {
        i -= 1;
      }
    }
    // With no separator this still eats the leading spaces, so removing a mid-group item
    // ("3x8 auto 60s" minus "auto") doesn't leave a double space behind.
    start = i + 1;
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

// Focus moved to a different editor on the same screen. Unlike deactivate — which only ends
// the keypad session — this drops the whole focus stack, so the backgrounded editor stops
// drawing its level and active-token highlights.
export function LiftoEditorSession_blur(session: ILiftoEditorSession): ILiftoEditorSessionResult {
  return {
    session: {
      ...session,
      active: undefined,
      focusedToken: undefined,
      context: undefined,
      focusLevel: undefined,
      anchor: undefined,
    },
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

// What the suggestion strip offers at `caret`. The caret is passed in rather than read off the
// session — it belongs to the controller — but the lookup lives here, next to the parse cache
// it reads. Pure: same session and caret, same answer.
export function LiftoEditorSession_completions(
  session: ILiftoEditorSession,
  caret: number | undefined,
  args: { customExercises?: IAllCustomExercises; exerciseFullNames?: string[]; index: PlannerCompletionsIndex }
): ICompletionResult | undefined {
  if (session.mode !== "freeform" || caret == null || caret > session.text.length) {
    return undefined;
  }
  return PlannerCompletions_at(session.text, caret, { ...args, cache: session.cache });
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
      return { ...next, context: LiftoEditorBrain_contextAt(session.cache, newText, Math.min(anchor, newText.length)) };
    }
  }
  return next;
}

export function LiftoEditorSession_activeLevelIndex(session: ILiftoEditorSession): number {
  const levels = session.context?.levels ?? [];
  return session.focusLevel != null ? Math.min(session.focusLevel, levels.length - 1) : levels.length - 1;
}

// Which exercise the caret sits in, as the planner's fullName. Inline this is the only way
// to tell — the document holds every exercise in the day.
export function LiftoEditorSession_focusedExerciseFullName(session: ILiftoEditorSession): string | undefined {
  return session.context?.levels.find((level) => level.nodeName === PlannerNodeName.ExerciseExpression)?.fullName;
}

// "Edit reused exercise…" opens a second editor on the reuse target. Inline that's noise:
// the whole day is already on screen, so the target is a few lines up in this very editor.
function scopePills(pills: ILiftoEditorPill[], scope: ILiftoEditorScope): ILiftoEditorPill[] {
  return scope === "day" ? pills.filter((pill) => pill.action !== "editReuse") : pills;
}

// Levels that own no rail (a set group's `auto`, a reuse target's week/day) are transparent —
// the walk falls through to the nearest ancestor that owns one, so focusing a token surfaces
// its context's actions. It stops at the first owner even when that rail is empty: `used: none`
// should show "No actions", not the whole exercise's pills.
export function LiftoEditorSession_pills(session: ILiftoEditorSession): ILiftoEditorPill[] {
  const levels = session.context?.levels ?? [];
  for (let i = LiftoEditorSession_activeLevelIndex(session); i >= 0; i -= 1) {
    const level = levels[i];
    if (level?.ownsRail) {
      return scopePills(level.pills, session.scope);
    }
  }
  return [];
}

export function LiftoEditorSession_highlight(session: ILiftoEditorSession): ILiftoEditorStyledRange[] {
  const ranges: ILiftoEditorStyledRange[] = [];
  const levelIndex = focusedLevelIndex(session);
  const level = session.context != null && levelIndex != null ? session.context.levels[levelIndex] : undefined;
  if (level != null && level.end > level.start) {
    ranges.push({ start: level.start, end: level.end, backgroundColor: Tailwind_semantic().background.editorfocus });
  }
  const active = session.active;
  if (active != null) {
    ranges.push({
      start: active.token.start,
      end: active.token.start + active.length,
      backgroundColor: Tailwind_semantic().background.editoractive,
    });
  }
  return ranges;
}
