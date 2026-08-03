import { JSX, useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LiftoEditor } from "../../components/primitives/liftoEditor";
import {
  ILiftoEditorContext,
  ILiftoEditorHandle,
  ILiftoEditorStyledRange,
  INumericToken,
  LiftoEditorBrain_contextAt,
  LiftoEditorBrain_focusTokens,
  LiftoEditorBrain_numericTokens,
  LiftoEditorBrain_stepToken,
} from "../../components/primitives/liftoEditorBrain";
import { Text } from "../../components/primitives/text";
import { useCloseCustomKeyboard, useOpenCustomKeyboard } from "../../navigation/CustomKeyboardContext";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { IPercentageUnit, IUnit } from "../../types";

const sampleText = `# Week 1
## Day 1
Squat / 5x5 / 100kg / progress: lp(5kg)
Bench Press, Barbell / 3x8-10 @8 60s / 80% / warmup: 2x5 45%, 1x3 60%
// A line comment
Deadlift[1-3] / 1x5 / 150kg+ / update: custom() {~ weights += 2.5kg ~}
`;

type IMode = "structured" | "freeform";

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

function Pill(props: { label: string; onPress: () => void; emphasized?: boolean }): JSX.Element {
  return (
    <Pressable
      className={`px-3 py-1 mr-2 mb-2 rounded-full border ${
        props.emphasized ? "border-border-neutral bg-background-subtle" : "border-border-neutral"
      }`}
      onPress={props.onPress}
    >
      <Text className="text-sm text-text-primary">{props.label}</Text>
    </Pressable>
  );
}

export function NavScreenEditorPlayground(): JSX.Element {
  const [mode, setMode] = useState<IMode>("structured");
  const [text, setText] = useState(sampleText);
  const [context, setContext] = useState<ILiftoEditorContext | undefined>(undefined);
  const [focusLevel, setFocusLevel] = useState<number | undefined>(undefined);
  const [highlight, setHighlight] = useState<ILiftoEditorStyledRange[]>([]);
  const handleRef = useRef<ILiftoEditorHandle | undefined>(undefined);
  const activeRef = useRef<IActiveNumber | undefined>(undefined);
  const anchorRef = useRef<number | undefined>(undefined);
  const contextRef = useRef<ILiftoEditorContext | undefined>(undefined);
  const focusLevelRef = useRef<number | undefined>(undefined);
  const textRef = useRef(text);
  textRef.current = text;
  const openKeyboard = useOpenCustomKeyboard();
  const closeKeyboard = useCloseCustomKeyboard();
  const insets = useSafeAreaInsets();

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
  }

  function activateToken(token: INumericToken): void {
    const parsed = parseToken(token);
    if (parsed == null) {
      return;
    }
    activeRef.current = parsed;
    anchorRef.current = Math.min(token.start + 1, token.end);
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
    refreshHighlight();
    closeKeyboard();
  }

  function openNumberKeyboard(): void {
    const active = activeRef.current;
    if (active == null) {
      return;
    }
    const breadcrumb = LiftoEditorBrain_contextAt(textRef.current, active.start + 1).breadcrumb.join(" › ");
    openKeyboard({
      id: "liftoEditorNumber",
      isNegative: active.buffer.startsWith("-"),
      withDot: active.buffer.includes("."),
      allowDot: true,
      keyboardAddon: (
        <View className="flex-row items-center justify-between px-4 py-1">
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
      ),
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
    const tokens = LiftoEditorBrain_numericTokens(textRef.current);
    const token = tokens.find((t) => index >= t.start && index <= t.end);
    if (token != null) {
      activateToken(token);
    } else {
      activeRef.current = undefined;
      anchorRef.current = index;
      closeKeyboard();
      applyContext(LiftoEditorBrain_contextAt(textRef.current, index), undefined);
    }
  }

  function insertPill(insertAt: number, insertText: string): void {
    handleRef.current?.replaceRange(insertAt, insertAt, insertText);
    deactivate();
    applyContext(undefined, undefined);
  }

  function switchToFreeform(): void {
    deactivate();
    applyContext(undefined, undefined);
    setMode("freeform");
  }

  const levels = context?.levels ?? [];
  const activeLevelIndex = focusLevel != null ? Math.min(focusLevel, levels.length - 1) : levels.length - 1;

  return (
    <View className="flex-1 bg-background-default">
      <View className="m-2 border border-border-neutral rounded-md overflow-hidden">
        <LiftoEditor
          initialText={sampleText}
          autoHeight={true}
          editable={mode === "freeform"}
          extraStyledRanges={highlight}
          handleRef={handleRef}
          onTextChange={setText}
          onTap={mode === "structured" ? handleTap : undefined}
        />
      </View>
      {mode === "structured" ? (
        <View className="mx-2">
          {levels.length > 0 ? (
            <View className="flex-row items-center mb-2">
              <Pressable className="px-3 py-1" onPress={() => walkFocus(-1)}>
                <Text className="text-lg font-semibold text-text-primary">‹</Text>
              </Pressable>
              <View className="flex-1 flex-row flex-wrap items-center justify-center">
                {levels.map((level, i) => (
                  <Pressable key={`${level.nodeName}-${level.start}`} onPress={() => selectLevel(i)}>
                    <Text
                      className={`text-sm ${i === activeLevelIndex ? "font-bold text-text-primary" : "text-text-secondary"}`}
                    >
                      {i > 0 ? " › " : ""}
                      {level.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable className="px-3 py-1" onPress={() => walkFocus(1)}>
                <Text className="text-lg font-semibold text-text-primary">›</Text>
              </Pressable>
            </View>
          ) : (
            <Text className="text-sm text-text-secondary mb-2">Tap a number to edit, or use pills below</Text>
          )}
          <View className="flex-row flex-wrap">
            {(context?.pills ?? []).map((pill) => (
              <Pill key={pill.label} label={pill.label} onPress={() => insertPill(pill.insertAt, pill.insertText)} />
            ))}
            <Pill label="Aa Edit as text" emphasized={true} onPress={switchToFreeform} />
          </View>
        </View>
      ) : (
        <View className="mx-2 flex-row items-center justify-between">
          <Text className="text-sm text-text-secondary">Freeform editing</Text>
          <Pill label="Done" emphasized={true} onPress={() => setMode("structured")} />
        </View>
      )}
      <View className="flex-1" />
      <View className="px-4 py-2 border-t border-border-neutral" style={{ paddingBottom: insets.bottom + 8 }}>
        <Text className="text-xs text-text-secondary">
          {mode === "structured" ? (context?.breadcrumb.join(" › ") ?? "structured") : "freeform"}
        </Text>
      </View>
    </View>
  );
}
