import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import {
  ILiftoEditorContext,
  ILiftoEditorHandle,
  ILiftoEditorPill,
  ILiftoEditorStyledRange,
  INumericToken,
  LiftoEditorBrain_contextAt,
  LiftoEditorBrain_focusTokens,
  LiftoEditorBrain_numericTokens,
  LiftoEditorBrain_stepToken,
} from "./primitives/liftoEditorBrain";
import { ILiftoEditorProps } from "./primitives/liftoEditor";
import { Text } from "./primitives/text";
import { PlatesCalculator } from "./inputWeight2";
import { useCloseCustomKeyboard, useOpenCustomKeyboard } from "../navigation/CustomKeyboardContext";
import { useModal } from "../navigation/ModalStateContext";
import { useTrackedState, untrack } from "../navigation/TrackedStateContext";
import { Weight_build } from "../models/weight";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { IExerciseType, IPercentageUnit, IUnit } from "../types";

export type ILiftoEditorMode = "structured" | "freeform";

interface IActiveNumber {
  start: number;
  length: number;
  buffer: string;
  suffix: string;
  kind: INumericToken["kind"];
  // The first digit after focusing replaces the value (type-to-replace), the rest append.
  fresh: boolean;
}

function parseToken(token: INumericToken): IActiveNumber | undefined {
  const match = token.text.match(/^([+-]?\d+(?:\.\d+)?)(.*)$/);
  if (match == null) {
    return undefined;
  }
  return {
    start: token.start,
    length: token.text.length,
    buffer: match[1],
    suffix: match[2],
    kind: token.kind,
    fresh: true,
  };
}

export interface ILiftoEditorController {
  mode: ILiftoEditorMode;
  text: string;
  context: ILiftoEditorContext | undefined;
  activeLevelIndex: number;
  // Add-actions for the active breadcrumb level; selecting a level swaps the rail.
  pills: ILiftoEditorPill[];
  editorProps: Pick<
    ILiftoEditorProps,
    "initialText" | "autoHeight" | "editable" | "extraStyledRanges" | "handleRef" | "onTextChange" | "onTap"
  >;
  walkFocus: (direction: 1 | -1) => void;
  selectLevel: (index: number) => void;
  insertPill: (insertAt: number, insertText: string) => void;
  removeFocused: () => void;
  switchToFreeform: () => void;
  switchToStructured: () => void;
}

// Playground-only: plates math needs an exercise for bar/equipment resolution; real screens
// will resolve it from the focused line's exercise name.
const sampleExerciseType: IExerciseType = { id: "squat", equipment: "barbell" };

export interface ILiftoEditorControllerOptions {
  // The sheet surface hosts breadcrumbs and ‹ › in its own header (always visible), so its
  // keypad drops the whole breadcrumb row. Screen surface keeps it in the keypad.
  showKeypadNav?: boolean;
}

export function useLiftoEditorController(
  initialText: string,
  options?: ILiftoEditorControllerOptions
): ILiftoEditorController {
  const showKeypadNav = options?.showKeypadNav ?? true;
  const [mode, setMode] = useState<ILiftoEditorMode>("structured");
  const [text, setText] = useState(initialText);
  const [context, setContext] = useState<ILiftoEditorContext | undefined>(undefined);
  const [focusLevel, setFocusLevel] = useState<number | undefined>(undefined);
  const [highlight, setHighlight] = useState<ILiftoEditorStyledRange[]>([]);
  const handleRef = useRef<ILiftoEditorHandle | undefined>(undefined);
  const activeRef = useRef<IActiveNumber | undefined>(undefined);
  const anchorRef = useRef<number | undefined>(undefined);
  const focusedTokenRef = useRef<{ start: number; end: number } | undefined>(undefined);
  const pendingCaretRef = useRef<number | undefined>(undefined);
  const contextRef = useRef<ILiftoEditorContext | undefined>(undefined);
  const focusLevelRef = useRef<number | undefined>(undefined);
  const textRef = useRef(text);
  textRef.current = text;
  const openKeyboard = useOpenCustomKeyboard();
  const closeKeyboard = useCloseCustomKeyboard();
  const state = useTrackedState();
  const settings = untrack(state.storage.settings);
  const openCalculator = useModal("repMaxCalculatorModal", (weightValue) => {
    const active = activeRef.current;
    if (active != null && weightValue != null) {
      active.buffer = `${weightValue}`;
      active.fresh = false;
      applyBuffer();
      openNumberKeyboard();
    }
  });

  function currentAnchor(): number | undefined {
    const active = activeRef.current;
    return active != null ? Math.min(active.start + 1, active.start + active.length) : anchorRef.current;
  }

  function focusedLevelIndex(): number | undefined {
    const ctx = contextRef.current;
    if (ctx == null || ctx.levels.length === 0) {
      return undefined;
    }
    const stored = focusLevelRef.current;
    return stored != null ? Math.min(stored, ctx.levels.length - 1) : ctx.levels.length - 1;
  }

  function applyContext(ctx: ILiftoEditorContext | undefined, level?: number): void {
    contextRef.current = ctx;
    focusLevelRef.current = level;
    setContext(ctx);
    setFocusLevel(level);
    refreshHighlight();
  }

  function refreshHighlight(): void {
    const active = activeRef.current;
    const ctx = contextRef.current;
    const levelIndex = focusedLevelIndex();
    const ranges: ILiftoEditorStyledRange[] = [];
    const level = ctx != null && levelIndex != null ? ctx.levels[levelIndex] : undefined;
    if (level != null && level.end > level.start) {
      ranges.push({ start: level.start, end: level.end, backgroundColor: `${Tailwind_semantic().syntax.comment}33` });
    }
    if (active != null) {
      ranges.push({
        start: active.start,
        end: active.start + active.length,
        backgroundColor: `${Tailwind_semantic().syntax.literal}33`,
      });
    }
    setHighlight(ranges);
  }

  // Edits move offsets, so the context (and especially pill insert positions) must be
  // recomputed from the current text — stale offsets would splice into the middle of tokens.
  useEffect(() => {
    if (contextRef.current != null) {
      const anchor = currentAnchor();
      if (anchor != null) {
        const ctx = LiftoEditorBrain_contextAt(text, Math.min(anchor, text.length));
        applyContext(ctx, focusLevelRef.current);
      }
    }
  }, [text]);

  function applyBuffer(): void {
    const active = activeRef.current;
    if (active == null) {
      return;
    }
    const tokenText = `${active.buffer === "" || active.buffer === "-" ? "0" : active.buffer}${active.suffix}`;
    handleRef.current?.replaceRange(active.start, active.start + active.length, tokenText);
    active.length = tokenText.length;
    refreshHighlight();
    // Rebuild the keypad config so addons that depend on the value (plates readout) update.
    if (active.kind === "weight") {
      openNumberKeyboard();
    }
  }

  function activateToken(token: INumericToken): void {
    const parsed = parseToken(token);
    if (parsed == null) {
      return;
    }
    activeRef.current = parsed;
    anchorRef.current = Math.min(token.start + 1, token.end);
    focusedTokenRef.current = { start: token.start, end: token.end };
    const ctx = LiftoEditorBrain_contextAt(textRef.current, Math.min(token.start + 1, token.end));
    applyContext(ctx, undefined);
    openNumberKeyboard();
  }

  function walkFocus(direction: 1 | -1): void {
    const tokens = LiftoEditorBrain_focusTokens(textRef.current);
    if (tokens.length === 0) {
      return;
    }
    // The reference point is the start of whatever is focused now (active number, focused
    // level, or last tap); › goes to the first token strictly after it, ‹ strictly before.
    const ctx = contextRef.current;
    const levelIndex = focusedLevelIndex();
    const current =
      activeRef.current?.start ??
      (ctx != null && levelIndex != null ? ctx.levels[levelIndex]?.start : undefined) ??
      anchorRef.current ??
      -1;
    let next: (typeof tokens)[number] | undefined;
    if (direction > 0) {
      next = tokens.find((t) => t.start > current) ?? tokens[0];
    } else {
      next = [...tokens].reverse().find((t) => t.start < current) ?? tokens[tokens.length - 1];
    }
    if (next.isNumeric) {
      const numeric = LiftoEditorBrain_numericTokens(textRef.current).find(
        (t) => t.start === next!.start && t.end === next!.end
      );
      if (numeric != null) {
        activateToken(numeric);
        return;
      }
    }
    activeRef.current = undefined;
    closeKeyboard();
    anchorRef.current = Math.min(next.start + 1, next.end);
    focusedTokenRef.current = { start: next.start, end: next.end };
    applyContext(LiftoEditorBrain_contextAt(textRef.current, Math.min(next.start + 1, next.end)), undefined);
  }

  function selectLevel(index: number): void {
    const ctx = contextRef.current;
    if (ctx == null || ctx.levels[index] == null) {
      return;
    }
    if (index < ctx.levels.length - 1 && activeRef.current != null) {
      activeRef.current = undefined;
      closeKeyboard();
    }
    applyContext(ctx, index);
  }

  function deactivate(): void {
    activeRef.current = undefined;
    focusedTokenRef.current = undefined;
    refreshHighlight();
    closeKeyboard();
  }

  function openNumberKeyboard(): void {
    const active = activeRef.current;
    if (active == null) {
      return;
    }
    const breadcrumb = showKeypadNav
      ? LiftoEditorBrain_contextAt(textRef.current, active.start + 1).breadcrumb.join(" › ")
      : "";
    const isWeight = active.kind === "weight" && (active.suffix === "kg" || active.suffix === "lb");
    const weightValue = parseFloat(active.buffer);
    const evaluatedWeight =
      isWeight && Number.isFinite(weightValue) ? Weight_build(weightValue, active.suffix as IUnit) : undefined;
    openKeyboard({
      id: "liftoEditorNumber",
      isNegative: active.buffer.startsWith("-"),
      withDot: active.buffer.includes("."),
      allowDot: true,
      keyboardAddon:
        showKeypadNav || evaluatedWeight != null ? (
          <View className="py-1">
            {showKeypadNav ? (
              <View className="flex-row items-center justify-between px-4">
                <Pressable className="px-4 py-1" onPress={() => walkFocus(-1)}>
                  <Text className="text-lg font-semibold text-text-primary">‹</Text>
                </Pressable>
                <Text className="text-sm text-text-secondary" numberOfLines={1}>
                  {breadcrumb}
                </Text>
                <Pressable className="px-4 py-1" onPress={() => walkFocus(1)}>
                  <Text className="text-lg font-semibold text-text-primary">›</Text>
                </Pressable>
              </View>
            ) : null}
            {evaluatedWeight != null ? (
              <View className="px-4 py-1">
                <PlatesCalculator weight={evaluatedWeight} settings={settings} exerciseType={sampleExerciseType} />
              </View>
            ) : undefined}
          </View>
        ) : undefined,
      enableCalculator: isWeight,
      onShowCalculator: isWeight
        ? () => {
            // closeKeyboard (not the config's onBlur) keeps activeRef, so the modal result
            // can re-apply into the same token and reopen the keypad.
            closeKeyboard();
            openCalculator({ unit: active.suffix as "kg" | "lb" });
          }
        : undefined,
      enableUnits: active.kind === "weight" ? (["kg", "lb"] as IUnit[]) : undefined,
      selectedUnit: active.kind === "weight" ? (active.suffix as IUnit) : undefined,
      onInput: (key) => {
        const current = activeRef.current;
        if (current == null) {
          return;
        }
        if (key === "⌫") {
          current.buffer = current.buffer.slice(0, -1);
          current.fresh = false;
        } else if (key === ".") {
          if (!current.buffer.includes(".")) {
            current.buffer = current.buffer === "" ? "0." : `${current.buffer}.`;
          }
          current.fresh = false;
        } else if (/^\d$/.test(key)) {
          current.buffer = current.fresh ? key : `${current.buffer}${key}`;
          current.fresh = false;
        }
        applyBuffer();
      },
      onPlus: () => stepActive(1),
      onMinus: () => stepActive(-1),
      onChangeUnits: (unit: IUnit | IPercentageUnit) => {
        const current = activeRef.current;
        if (current != null && (unit === "kg" || unit === "lb")) {
          current.suffix = unit;
          applyBuffer();
        }
      },
      onBlur: deactivate,
    });
  }

  function stepActive(direction: 1 | -1): void {
    const active = activeRef.current;
    if (active == null) {
      return;
    }
    const tokenText = `${active.buffer}${active.suffix}`;
    const stepped = LiftoEditorBrain_stepToken(
      { start: active.start, end: active.start + active.length, text: tokenText, kind: active.kind },
      direction
    );
    if (stepped == null) {
      return;
    }
    const match = stepped.match(/^([+-]?\d+(?:\.\d+)?)(.*)$/);
    if (match == null) {
      return;
    }
    active.buffer = match[1];
    active.suffix = match[2];
    applyBuffer();
  }

  function handleTap(index: number): void {
    // Tapping the already-focused token again drills past structured mode into freeform,
    // with the caret landing where the finger did.
    const focused = focusedTokenRef.current;
    if (focused != null && index >= focused.start && index <= focused.end) {
      pendingCaretRef.current = index;
      switchToFreeform();
      return;
    }
    const tokens = LiftoEditorBrain_numericTokens(textRef.current);
    const token = tokens.find((t) => index >= t.start && index <= t.end);
    if (token != null) {
      activateToken(token);
    } else {
      activeRef.current = undefined;
      anchorRef.current = index;
      const focusToken = LiftoEditorBrain_focusTokens(textRef.current).find((t) => index >= t.start && index <= t.end);
      focusedTokenRef.current = focusToken != null ? { start: focusToken.start, end: focusToken.end } : undefined;
      closeKeyboard();
      applyContext(LiftoEditorBrain_contextAt(textRef.current, index), undefined);
    }
  }

  // The editable prop flips on the freeform render commit; the caret can only be placed
  // (and the system keyboard summoned) after the native side has applied it.
  useEffect(() => {
    if (mode === "freeform" && pendingCaretRef.current != null) {
      const caret = pendingCaretRef.current;
      pendingCaretRef.current = undefined;
      setTimeout(() => handleRef.current?.setSelection(caret, caret), 50);
    }
  }, [mode]);

  // Focus survives the insert (the rail should update in place, not vanish); refs shift by
  // the inserted length when the insert lands before them, and the text-change effect
  // recomputes the context at the shifted anchor.
  function insertPill(insertAt: number, insertText: string): void {
    if (activeRef.current != null) {
      activeRef.current = undefined;
      closeKeyboard();
    }
    const anchor = anchorRef.current;
    if (anchor != null && insertAt <= anchor) {
      anchorRef.current = anchor + insertText.length;
    }
    const focused = focusedTokenRef.current;
    if (focused != null && insertAt <= focused.start) {
      focusedTokenRef.current = { start: focused.start + insertText.length, end: focused.end + insertText.length };
    }
    handleRef.current?.replaceRange(insertAt, insertAt, insertText);
  }

  function removeFocused(): void {
    const ctx = contextRef.current;
    const levelIndex = focusedLevelIndex();
    const level = ctx != null && levelIndex != null ? ctx.levels[levelIndex] : undefined;
    if (level == null) {
      return;
    }
    const currentText = textRef.current;
    let start = level.start;
    // A removed section takes its leading " / " separator with it, so "5x5 / 100kg / progress"
    // minus the weight yields "5x5 / progress", not "5x5 /  / progress".
    let i = start - 1;
    while (i >= 0 && currentText[i] === " ") {
      i -= 1;
    }
    if (i >= 0 && currentText[i] === "/") {
      i -= 1;
      while (i >= 0 && currentText[i] === " ") {
        i -= 1;
      }
      start = i + 1;
    }
    handleRef.current?.replaceRange(start, level.end, "");
    deactivate();
    applyContext(undefined, undefined);
  }

  function switchToFreeform(): void {
    deactivate();
    applyContext(undefined, undefined);
    setMode("freeform");
  }

  function switchToStructured(): void {
    setMode("structured");
  }

  const levels = context?.levels ?? [];
  const activeLevelIndex = focusLevel != null ? Math.min(focusLevel, levels.length - 1) : levels.length - 1;

  return {
    mode,
    text,
    context,
    activeLevelIndex,
    pills: levels[activeLevelIndex]?.pills ?? [],
    editorProps: {
      initialText,
      autoHeight: true,
      editable: mode === "freeform",
      extraStyledRanges: highlight,
      handleRef,
      onTextChange: setText,
      onTap: mode === "structured" ? handleTap : undefined,
    },
    walkFocus,
    selectLevel,
    insertPill,
    removeFocused,
    switchToFreeform,
    switchToStructured,
  };
}
