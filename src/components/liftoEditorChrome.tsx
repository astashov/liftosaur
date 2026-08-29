import { JSX, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { lb } from "lens-shmens";
import { useAppState } from "../navigation/StateContext";
import { IState, updateState } from "../models/state";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { useRem } from "../utils/useRem";
import { useSystemKeyboardHeight } from "../utils/useSystemKeyboardHeight";
import { Text } from "./primitives/text";
import { FadeScrollView } from "./fadeScrollView";
import { IconArrowDown2 } from "./icons/iconArrowDown2";
import { IconCloseCircleOutline } from "./icons/iconCloseCircleOutline";
import { IconPreview } from "./icons/iconPreview";
import { IconTrash } from "./icons/iconTrash";
import type { ILiftoEditorPillCategory } from "./primitives/liftoEditorActions";
import { ILiftoEditorHint, LiftoEditorHints_helpId } from "./primitives/liftoEditorHints";
import type { ILiftoEditorController } from "./liftoEditorController";
import type { ICompletionKind } from "../pages/planner/plannerCompletions";

function pillHue(category: ILiftoEditorPillCategory): { fg: string; bd: string; bg: string } {
  const pill = Tailwind_semantic().editorpill;
  switch (category) {
    case "weight":
      return { fg: pill.weightfg, bd: pill.weightbd, bg: pill.weightbg };
    case "timer":
      return { fg: pill.timerfg, bd: pill.timerbd, bg: pill.timerbg };
    case "logic":
      return { fg: pill.logicfg, bd: pill.logicbd, bg: pill.logicbg };
    case "sets":
      return { fg: pill.setsfg, bd: pill.setsbd, bg: pill.setsbg };
    case "progress":
      return { fg: pill.progressfg, bd: pill.progressbd, bg: pill.progressbg };
    case "neutral":
      return { fg: pill.neutralfg, bd: pill.neutralbd, bg: pill.neutralbg };
  }
}

export function useLiftoEditorHintDismissed(): [boolean, (dismissed: boolean) => void] {
  const { state, dispatch } = useAppState();
  const dismissed = state.storage.helps.includes(LiftoEditorHints_helpId);
  const setDismissed = (value: boolean): void => {
    updateState(
      dispatch,
      [
        lb<IState>()
          .p("storage")
          .p("helps")
          .recordModify((helps) =>
            value
              ? helps.includes(LiftoEditorHints_helpId)
                ? helps
                : [...helps, LiftoEditorHints_helpId]
              : helps.filter((h) => h !== LiftoEditorHints_helpId)
          ),
      ],
      value ? "Dismiss editor hints" : "Enable editor hints"
    );
  };
  return [dismissed, setDismissed];
}

export function LiftoEditorCrumbs(props: { controller: ILiftoEditorController }): JSX.Element {
  const { controller } = props;
  const levels = controller.context?.levels ?? [];
  const semantic = Tailwind_semantic();
  if (levels.length === 0) {
    return <Text className="text-sm text-text-secondary">Tap a token to focus</Text>;
  }
  return (
    <View className="flex-row flex-wrap items-center py-1">
      {levels.map((level, i) => {
        const isActive = i === controller.activeLevelIndex;
        return (
          <View key={`${level.nodeName}-${level.start}`} className="flex-row items-center">
            {i > 0 ? <Text className="text-xs text-text-secondary px-1">/</Text> : null}
            {/* A line of text-xs is a thin target vertically. Horizontal slop stays at 4 —
                that's exactly half the px-1 separator either side, so neighbouring crumbs
                meet without overlapping and stealing each other's taps. */}
            <Pressable hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }} onPress={() => controller.selectLevel(i)}>
              <Text
                className="text-xs text-text-secondary"
                style={{
                  textDecorationLine: "underline",
                  // Android ignores textDecorationStyle and falls back to a solid underline.
                  textDecorationStyle: "dotted",
                  textDecorationColor: isActive ? semantic.text.purple : semantic.text.disabled,
                  ...(isActive ? { color: semantic.text.purple } : null),
                }}
              >
                {level.label}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

export function LiftoEditorPillRail(props: {
  controller: ILiftoEditorController;
  className?: string;
  // Hosts that own something the focused text can't be the authority on — the editor sheet
  // forbids removing a section that another day declares.
  canRemove?: boolean;
  // Whole-exercise, not token-scoped like the trash beside it, but this is the row of things
  // you do *to* the text rather than *in* it. Hosts that can't resolve the text (no program to
  // resolve it against) leave it out.
  onPreview?: () => void;
  isPreviewing?: boolean;
}): JSX.Element {
  const { controller } = props;
  const iconScale = useRem() / 16;
  const pillRailRef = useRef<ScrollView>(null);
  // Keyed on the level's start (not end) so typing into the focused token — which only
  // moves its end — doesn't yank the rail back while it's being used.
  const activeLevel = controller.context?.levels[controller.activeLevelIndex];
  const pillRailResetKey = `${controller.activeLevelIndex}:${activeLevel?.start ?? -1}`;
  useEffect(() => {
    pillRailRef.current?.scrollTo({ x: 0, animated: false });
  }, [pillRailResetKey]);

  return (
    <View className={`flex-row items-center ${props.className ?? ""}`}>
      <FadeScrollView className="flex-1" contentClassName="gap-2 px-3 py-2" scrollRef={pillRailRef}>
        {controller.pills.map((pill) => {
          const hue = pillHue(pill.category);
          return (
            <Pressable
              key={pill.label}
              className="rounded-lg px-3 py-1.5"
              style={{ backgroundColor: hue.bg, borderWidth: 1, borderColor: hue.bd }}
              onPress={() => controller.pressPill(pill)}
            >
              <Text className="text-xs font-bold" style={{ color: hue.fg }}>
                {pill.label}
              </Text>
            </Pressable>
          );
        })}
        {controller.pills.length === 0 ? <Text className="text-xs text-text-secondary py-1.5">No actions</Text> : null}
      </FadeScrollView>
      {/* Same w-scaled-10 centered column as the hint bar's dismiss and the dock's close, so the three
          right-edge affordances share a vertical axis despite differing icon widths. */}
      <View className="flex-row items-center border-l border-border-neutral">
        {props.onPreview != null ? (
          <Pressable
            testID="editor-preview-toggle"
            className="items-center w-scaled-10 py-2"
            hitSlop={{ top: 8, right: 4, bottom: 8, left: 4 }}
            onPress={props.onPreview}
          >
            <IconPreview
              size={18 * iconScale}
              color={props.isPreviewing ? Tailwind_semantic().text.purple : undefined}
            />
          </Pressable>
        ) : null}
        {(props.canRemove ?? true) && (controller.context?.levels ?? []).length > 0 ? (
          <Pressable
            className="items-center w-scaled-10 py-2"
            // Left slop stays small so it doesn't swallow taps meant for the last pill.
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 4 }}
            onPress={controller.removeFocused}
          >
            <IconTrash width={15 * iconScale} height={18 * iconScale} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function completionHue(kind: ICompletionKind): { fg: string; bd: string; bg: string } {
  switch (kind) {
    case "section":
    case "progressFn":
      return pillHue("progress");
    case "stateVar":
    case "liftoscript":
      return pillHue("logic");
    case "exercise":
    case "exerciseVariant":
    case "reuse":
      return pillHue("neutral");
  }
}

// Freeform's answer to the pill rail: the same completions CodeMirror offers on the web, as a
// strip of words sitting on the system keyboard. Rendered for the whole of freeform rather than
// only when there's something to offer — an exercise line almost always has suggestions, and a
// bar that came and went would shove the text around on nearly every keystroke.
export function LiftoEditorSuggestBar(props: {
  controller: ILiftoEditorController;
  className?: string;
}): JSX.Element | null {
  const { controller } = props;
  const iconScale = useRem() / 16;
  const scrollRef = useRef<ScrollView>(null);
  const completions = controller.completions;
  // The bar is the keyboard's accessory, not the mode's: putting the keyboard away without
  // leaving freeform — which the sheets allow, since Apply is their only exit — would otherwise
  // leave it stranded at the bottom of the screen with nothing under it.
  const hasKeyboard = useSystemKeyboardHeight() > 0;
  // Keyed on where the completion starts, not on the query: narrowing the same word re-ranks
  // in place, and yanking the strip back to 0 mid-scroll would fight the finger.
  const resetKey = `${completions?.kind ?? ""}:${completions?.from ?? -1}`;
  useEffect(() => {
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [resetKey]);

  if (!hasKeyboard) {
    return null;
  }

  return (
    // Rounded and outlined, not a square-edged band: the iOS keyboard has rounded top corners
    // and a hard edge laid across them reads as a misfit. It runs to the screen edges the way
    // the keyboard does, though — inset sides would make it a card sitting on a slab instead of
    // the next layer of one. The 2px below is just enough to keep the two roundings apart.
    // Fixed height, because the row is empty whenever the caret has nothing to offer, and a bar
    // that shrank to its chevron would bounce the text on every other keystroke.
    <View
      className={`flex-row items-center overflow-hidden h-scaled-12 border bg-background-default border-border-neutral ${
        props.className ?? ""
      }`}
      // Android's Uniwind drops a className borderRadius when the class list is rebuilt, which
      // the host's className does here. The margin is the whole gap to the keyboard now — the
      // sheets drop their own 1rem of IME clearance while this bar is up.
      style={{ borderRadius: 12, marginBottom: 4 }}
    >
      {/* px matches py so the chips sit the same distance from every edge of the card. */}
      <FadeScrollView className="flex-1" contentClassName="gap-2 px-2 py-2 items-center" scrollRef={scrollRef}>
        {(completions?.options ?? []).map((option) => {
          const hue = completionHue(completions!.kind);
          return (
            <Pressable
              key={option.label}
              testID={`editor-suggestion-${option.label}`}
              className="px-3 py-1.5"
              // Same reason as the container's.
              style={{ borderRadius: 8, backgroundColor: hue.bg, borderWidth: 1, borderColor: hue.bd }}
              onPress={() => controller.applyCompletion(option)}
            >
              <Text className="text-xs font-bold" numberOfLines={1} style={{ color: hue.fg }}>
                {option.display ?? option.label}
              </Text>
            </Pressable>
          );
        })}
      </FadeScrollView>
      {/* Same w-scaled-10 centered column as the dock's close and the hint bar's dismiss. On iOS
          this replaces Runestone's own inputAccessoryView toolbar, which would otherwise stack a
          second bar between this one and the keyboard. Full-height divider, so it reads as part
          of the card's edge rather than a floating tick next to the last chip. */}
      <View className="flex-row items-center self-stretch border-l border-border-neutral">
        <Pressable
          testID="editor-suggestions-hide-keyboard"
          className="items-center justify-center w-scaled-10 self-stretch"
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 4 }}
          onPress={controller.hideKeyboard}
        >
          <IconArrowDown2 width={13 * iconScale} height={8 * iconScale} />
        </Pressable>
      </View>
    </View>
  );
}

// Animated expand/collapse without knowing content height upfront: the collapsed row sits
// in flow (defines the resting height), the expanded content is an invisible absolute layer
// that only gets measured; tapping interpolates the container height between the two
// measurements while cross-fading the layers.
export function LiftoEditorHintBar(props: { hint: ILiftoEditorHint; onDismiss: () => void }): JSX.Element {
  const semantic = Tailwind_semantic();
  const iconScale = useRem() / 16;
  const [expanded, setExpanded] = useState(false);
  const collapsedHeight = useSharedValue(0);
  const expandedHeight = useSharedValue(0);
  const progress = useSharedValue(0);

  const containerStyle = useAnimatedStyle(() => {
    if (progress.value === 0 || collapsedHeight.value === 0 || expandedHeight.value === 0) {
      return { height: "auto" };
    }
    return { height: collapsedHeight.value + (expandedHeight.value - collapsedHeight.value) * progress.value };
  });
  const collapsedStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const expandedStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const toggle = (): void => {
    const next = !expanded;
    setExpanded(next);
    progress.value = withTiming(next ? 1 : 0, { duration: 200, easing: Easing.inOut(Easing.ease) });
  };

  return (
    <Pressable
      style={{
        backgroundColor: semantic.background.cardyellow,
        borderBottomWidth: 1,
        borderBottomColor: semantic.border.cardyellow,
      }}
      onPress={toggle}
      // CustomKeyboardProvider closes the keypad on any stationary tap that bubbles up to
      // it; expanding/dismissing the hint shouldn't dismiss the keypad.
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <Animated.View style={[{ overflow: "hidden" }, containerStyle]}>
        <Animated.View
          style={collapsedStyle}
          className="px-3 py-2 pr-10"
          onLayout={(e) => {
            collapsedHeight.value = e.nativeEvent.layout.height;
          }}
        >
          <Text className="text-xs font-semibold" style={{ color: semantic.text.cardyellow }} numberOfLines={1}>
            {props.hint.short}
          </Text>
        </Animated.View>
        <Animated.View
          style={[{ position: "absolute", top: 0, left: 0, right: 0 }, expandedStyle]}
          className="px-3 py-2 pr-10"
          onLayout={(e) => {
            expandedHeight.value = e.nativeEvent.layout.height;
          }}
        >
          <Text className="text-xs font-semibold" style={{ color: semantic.text.cardyellow }}>
            {props.hint.short}
          </Text>
          <Text className="text-xs pt-1" style={{ color: semantic.text.cardyellowsubtle }}>
            {props.hint.detail}
          </Text>
        </Animated.View>
      </Animated.View>
      <Pressable
        className="items-center w-scaled-10 py-2"
        style={{ position: "absolute", top: 0, right: 0 }}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 4 }}
        onPress={props.onDismiss}
      >
        <IconCloseCircleOutline size={20 * iconScale} />
      </Pressable>
    </Pressable>
  );
}
