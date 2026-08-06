import { JSX, useEffect, useRef, useState } from "react";
import { Keyboard, LayoutChangeEvent, Platform, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useModal } from "../ModalStateContext";
import { Dialog_confirm } from "../../utils/dialog";
import type { IExercisePickerSelectedExercise } from "../../types";
import type { ILiftoEditorPillCategory } from "../../components/primitives/liftoEditorActions";
import { useCloseCustomKeyboard, useCustomKeyboardHeight } from "../CustomKeyboardContext";
import { LiftoEditor } from "../../components/primitives/liftoEditor";
import type { ILiftoEditorStyledRange } from "../../components/primitives/liftoEditorBrain";
import { ILiftoEditorController, useLiftoEditorController } from "../../components/liftoEditorController";
import { Text } from "../../components/primitives/text";
import { FadeScrollView } from "../../components/fadeScrollView";
import { IconArrowRight } from "../../components/icons/iconArrowRight";
import { IconCloseCircleOutline } from "../../components/icons/iconCloseCircleOutline";
import { IconTrash } from "../../components/icons/iconTrash";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { useRem } from "../../utils/useRem";
import type { IEditorSheetBodyProps, IEditorSheetInstanceOption, IEditorSheetLiveError } from "./editorSheetTypes";

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

interface IEditorHint {
  short: string;
  detail: string;
}

const editorPropertyHints: Partial<Record<string, IEditorHint>> = {
  progress: {
    short: "Progress: how program exercise changes after a workouts.",
    detail:
      "Runs after you finish a workout and adjusts the future ones. Defined via a function — tap it to learn what it does. 'progress: none' disables it, e.g. for a deload week.",
  },
  update: {
    short: "Update: a script that runs after every completed set.",
    detail:
      "'setIndex' is the set you just completed — 0 means it's running before the workout starts. Use it to adjust the remaining sets right away, e.g. '{~ if (setIndex == 1) { weights += 2.5kg } ~}'.",
  },
  warmup: {
    short: "Warmups: sets that are not accounted in progress/update and for volume",
    detail:
      "E.g. 'warmup: 2x5 45%, 1x3 135lb' — percentages here are of the first work set's weight, not your 1RM. 'warmup: none' removes warmups.",
  },
  used: {
    short: "'used: none' removes this exercise from workouts — others can still reuse it.",
    detail:
      "With an unknown exercise name it acts as a template (e.g. '...T1'). Updating its reps/weights moves those values into overrides in the exercises reusing it. Also handy for reserving exercises for quick swapping.",
  },
  id: {
    short: "Id: tags this exercise so other exercises' scripts can reach its state.",
    detail:
      "'id: tags(1, 100)' — progress/update scripts of other exercises can change state variables of everything sharing a tag: 'state[1].rating = 5'.",
  },
};

const editorProgressFunctionHints: Partial<Record<string, IEditorHint>> = {
  lp: {
    short: "lp: linear progression — add weight after successful workouts.",
    detail:
      "'lp(5lb)' adds 5lb after every successful workout. 'lp(5lb, 2, 0)' waits for 2 successes; 'lp(5lb, 1, 0, 10lb, 2, 0)' also drops 10lb after 2 failed ones.",
  },
  dp: {
    short: "dp: double progression — reps climb first, then the weight.",
    detail:
      "'dp(5lb, 8, 12)' — on success reps go up from 8 towards 12; at 12 the weight adds 5lb and reps reset to 8.",
  },
  sum: {
    short: "sum: progress when total reps across all sets reach a target.",
    detail: "'sum(30, 5lb)' — if completed reps across all sets add up to 30 or more, add 5lb.",
  },
  custom: {
    short: "custom: your own progression script, run after finishing the workout.",
    detail:
      "'custom() {~ if (completedReps >= reps) { weights += 5lb } ~}'. Reuse another exercise's script with 'custom() { ...Squat }'.",
  },
};

const editorNodeHints: Partial<Record<string, IEditorHint>> = {
  SetPart: {
    short: "Sets × reps: '3x8' — 3 sets of 8 reps.",
    detail: "'3x8-12' — rep range, '1x5+' — AMRAP (do as many reps as you can, the app asks how many you did).",
  },
  Weight: {
    short: "Weight: an explicit weight for these sets.",
    detail: "E.g. '100kg' or '85lb'. Add '+' ('100lb+') and the app asks what weight you actually used.",
  },
  WeightWithPlus: {
    short: "Weight: an explicit weight for these sets.",
    detail: "E.g. '100kg' or '85lb'. Add '+' ('100lb+') and the app asks what weight you actually used.",
  },
  Percentage: {
    short: "Percentage: weight as a % of your 1RM for this exercise.",
    detail: "'80%' resolves against the 1RM from your settings. '80%+' also asks what weight you actually used.",
  },
  PercentageWithPlus: {
    short: "Percentage: weight as a % of your 1RM for this exercise.",
    detail: "'80%' resolves against the 1RM from your settings. '80%+' also asks what weight you actually used.",
  },
  Rpe: {
    short: "RPE: target effort for these sets, from 1 to 10.",
    detail:
      "'@8' — target RPE 8. With no explicit weight, the app derives it from your 1RM, reps and RPE. '@8+' also logs the actual RPE after the set.",
  },
  Timer: {
    short: "Rest timer: how long to rest after each of these sets.",
    detail: "'90s' starts a 90-second rest timer when you complete a set of this group.",
  },
  SetTimer: {
    short: "Set timer: how long the set itself lasts, then the rest.",
    detail:
      "'60s|30s' — 60s active set (plank, carries…), then 30s rest. '30s+|60s' counts up past 30s until you stop it. Add 'auto' to advance sets automatically (EMOM/circuits).",
  },
  SetLabel: {
    short: "Set label: a name shown next to these sets in the workout.",
    detail: "'4x5 (Main), 1x5+ (AMRAP)' — in parentheses after sets×reps, 8 characters max.",
  },
  ReuseSection: {
    short: "Reuse: copies sets, weight, RPE, timer, warmups and progress from another exercise.",
    detail:
      "'...Bench Press' finds it in the current week. '...Bench Press[2]' — day 2 of this week, '...Bench Press[2:1]' — week 2, day 1. Sections after it override the reused parts.",
  },
  WeekDay: {
    short: "Week/Day: where to reuse the exercise from.",
    detail: "'[2]' — day 2 of the current week, '[2:1]' — week 2, day 1, '[_:1]' — day 1 of every week.",
  },
  Repeat: {
    short: "Repeat: this exercise repeats across the listed weeks.",
    detail:
      "'Squat[1-3]' — appears in weeks 1–3 on this day without copy-pasting it. Editing the declaration applies to all the repeated weeks.",
  },
  Superset: {
    short: "Superset: exercises sharing a group name alternate together.",
    detail: "'superset: A' — all exercises marked with group 'A' are performed as a superset in the workout.",
  },
  KeyValue: {
    short: "State variable: a value the script remembers between workouts.",
    detail:
      "Defined as 'name: initialValue' inside custom(). Scripts read and change it via 'state.name', and the app stores it per exercise.",
  },
  ExerciseName: {
    short: "Label: distinguishes two copies of the same exercise.",
    detail:
      "'aux: Bench Press' and 'Bench Press' count as separate exercises with their own progress, so the same movement can appear twice in a program.",
  },
};

const editorFallbackHints = {
  exercise: {
    short: "Exercise: one movement — its warmups, set groups and progression.",
    detail:
      "Sections are separated by '/'. E.g. 'Squat / 3x5 / 100kg / progress: lp(5kg)' — name, sets×reps, weight, progression.",
  },
  property: {
    short: "Property: progression, warmups or update logic for this exercise.",
    detail:
      "E.g. 'progress: lp(5kg)' adds 5kg after a successful day, 'warmup: 2x5 45%' defines warmup sets, 'update: custom() {~ ... ~}' runs a script after each set.",
  },
  globals: {
    short: "Globals: defaults applied to every set group of this exercise.",
    detail:
      "E.g. 'Squat / 3x5, 5x3 / 100kg 90s' — the weight and timer apply to both set groups unless a group sets its own.",
  },
  warmupPercentage: {
    short: "Warmup percentage: % of the first work set's weight, not your 1RM.",
    detail: "'warmup: 1x5 45%, 1x3 80%' — 45% and 80% of the weight of the first work set.",
  },
  setGroup: {
    short: "Set group: sets × reps, then weight. % here resolve against your 1RM.",
    detail: "E.g. '3x8-10 @8 60s 80%' — 3 sets of 8-10 reps at RPE 8, 60s rest timer, at 80% of your 1RM.",
  },
  valueWeight: {
    short: "Weight value.",
    detail: "Could be lb or kg, likely would be converted to your default or equipment unit in the workout.",
  },
};

function hintForContext(controller: ILiftoEditorController): IEditorHint | undefined {
  const levels = controller.context?.levels ?? [];
  const level = levels[controller.activeLevelIndex];
  if (level == null) {
    return undefined;
  }
  if (level.nodeName === "ExerciseExpression") {
    return editorFallbackHints.exercise;
  }
  const property = levels.find((l) => l.nodeName === "ExerciseProperty")?.label.toLowerCase();
  if (level.nodeName === "FunctionExpression" && property === "progress") {
    const functionHint = editorProgressFunctionHints[level.label.replace("()", "")];
    if (functionHint != null) {
      return functionHint;
    }
  }
  if (level.nodeName === "ExerciseProperty" || level.nodeName === "FunctionExpression") {
    return (property != null ? editorPropertyHints[property] : undefined) ?? editorFallbackHints.property;
  }
  const inWarmup = levels.some((l) => l.nodeName === "WarmupExerciseSets");
  if (inWarmup) {
    if (level.nodeName === "Percentage" || level.nodeName === "PercentageWithPlus") {
      return editorFallbackHints.warmupPercentage;
    }
    return editorPropertyHints.warmup;
  }
  if (level.nodeName === "ExerciseSet" && level.label === "Globals") {
    return editorFallbackHints.globals;
  }
  // Only set-group weights support the '+' suffix (the grammar's WeightWithPlus); weights
  // inside function args, state vars or scripts are plain values and get their own hint.
  const isValueContext = levels.some(
    (l) => l.nodeName === "FunctionExpression" || l.nodeName === "KeyValue" || l.nodeName === "Liftoscript"
  );
  if (level.nodeName === "Weight" && isValueContext) {
    return editorFallbackHints.valueWeight;
  }
  return editorNodeHints[level.nodeName] ?? editorFallbackHints.setGroup;
}

function SheetCrumbs(props: { controller: ILiftoEditorController }): JSX.Element {
  const { controller } = props;
  const levels = controller.context?.levels ?? [];
  const semantic = Tailwind_semantic();
  if (levels.length === 0) {
    return <Text className="text-sm text-text-secondary">Tap a token to focus</Text>;
  }
  return (
    <View className="flex-row flex-wrap items-center">
      {levels.map((level, i) => {
        const isActive = i === controller.activeLevelIndex;
        return (
          <View key={`${level.nodeName}-${level.start}`} className="flex-row items-center">
            {i > 0 ? <Text className="text-xs text-text-secondary px-1">/</Text> : null}
            <Pressable onPress={() => controller.selectLevel(i)}>
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

// Must render inside the sheet's own CustomKeyboardProvider: native-stack modal screens sit
// above the app root in the native hierarchy, so the root keyboard host would draw BEHIND
// the sheet (same reason NavModalEditTarget nests a provider).
// Android is adjustResize (the window shrinks under the IME), so only iOS needs manual
// keyboard avoidance for the bottom-anchored sheet.
function useSystemKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== "ios") {
      return;
    }
    const showSub = Keyboard.addListener("keyboardWillShow", (e) => setHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener("keyboardWillHide", () => setHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  return height;
}

// Animated expand/collapse without knowing content height upfront: the collapsed row sits
// in flow (defines the resting height), the expanded content is an invisible absolute layer
// that only gets measured; tapping interpolates the container height between the two
// measurements while cross-fading the layers.
function HintBar(props: { hint: { short: string; detail: string }; onDismiss: () => void }): JSX.Element {
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
      <Pressable style={{ position: "absolute", top: 8, right: 12 }} onPress={props.onDismiss}>
        <IconCloseCircleOutline size={20 * iconScale} />
      </Pressable>
    </Pressable>
  );
}

export function EditorSheetBody(props: IEditorSheetBodyProps): JSX.Element {
  // useModal registers its result callback once, but the controller hands a fresh
  // callback per action invocation — these refs bridge the two.
  const pickerSelectRef = useRef<((selected: IExercisePickerSelectedExercise) => void) | undefined>(undefined);
  const renameSubmitRef = useRef<((value: string) => void) | undefined>(undefined);
  const openExercisePicker = useModal("editorSheetExercisePickerModal", (selected) => {
    const onSelect = pickerSelectRef.current;
    pickerSelectRef.current = undefined;
    if (selected != null && onSelect != null) {
      onSelect(selected);
    }
  });
  const openRename = useModal("textInputModal", (value) => {
    const onSubmit = renameSubmitRef.current;
    renameSubmitRef.current = undefined;
    if (value != null && onSubmit != null) {
      onSubmit(value);
    }
  });
  const controller = useLiftoEditorController(props.initialText, {
    exerciseType: props.pickerData?.exerciseType,
    actions: {
      pickExercise: (_current, onSelect) => {
        pickerSelectRef.current = onSelect;
        openExercisePicker(props.pickerData ?? {});
      },
      promptRename: (current, onSubmit) => {
        renameSubmitRef.current = onSubmit;
        openRename({
          title: "Rename label",
          inputLabel: "Label",
          placeholder: current,
          submitLabel: "Rename",
          dataCyPrefix: "rename-label",
          maxLength: 8,
        });
      },
      editReuse: (targetName) => props.onEditReuse?.(targetName),
    },
  });
  const [hintDismissed, setHintDismissed] = useState(false);
  const [liveError, setLiveError] = useState<IEditorSheetLiveError | undefined>(undefined);
  const validateTextRef = useRef(props.validateText);
  validateTextRef.current = props.validateText;
  const onTextChangeRef = useRef(props.onTextChange);
  onTextChangeRef.current = props.onTextChange;
  const liveErrorText = controller.text;
  useEffect(() => {
    onTextChangeRef.current?.(liveErrorText);
  }, [liveErrorText]);
  // Debounced: validation evaluates the whole program, too heavy per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setLiveError(validateTextRef.current?.(liveErrorText)), 300);
    return () => clearTimeout(timer);
  }, [liveErrorText]);
  // Clamp against the current text: between debounce ticks the error range can be stale.
  const errorStyledRanges: ILiftoEditorStyledRange[] = [];
  if (liveError?.from != null && liveError.to != null && liveError.from < controller.text.length) {
    errorStyledRanges.push({
      start: liveError.from,
      end: Math.min(Math.max(liveError.to, liveError.from + 1), controller.text.length),
      backgroundColor: `${Tailwind_semantic().text.error}26`,
    });
  }
  const hint = hintForContext(controller);
  const accent = Tailwind_semantic().text.purple;
  const iconScale = useRem() / 16;
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const systemKeyboardHeight = useSystemKeyboardHeight();
  const keypadHeight = useCustomKeyboardHeight();
  const closeKeyboard = useCloseCustomKeyboard();
  const isFreeform = controller.mode === "freeform";
  const railRef = useRef<ScrollView>(null);
  // Only on the initial layout: the body remounts on instance switch, and reacting to later
  // re-layouts would yank the rail away from wherever the user scrolled it.
  const hasAutoScrolledRail = useRef(false);
  const scrollSelectedIntoView = (event: LayoutChangeEvent): void => {
    if (hasAutoScrolledRail.current) {
      return;
    }
    hasAutoScrolledRail.current = true;
    const x = event.nativeEvent.layout.x;
    requestAnimationFrame(() => railRef.current?.scrollTo({ x: Math.max(0, x - 24), animated: false }));
  };

  const selectInstance = async (instance: IEditorSheetInstanceOption): Promise<void> => {
    if (instance.isSelected) {
      return;
    }
    if (controller.text.trim() !== props.initialText.trim()) {
      if (!(await Dialog_confirm("Discard unsaved changes to this exercise?"))) {
        return;
      }
    }
    // The keypad host lives outside this component; switching remounts the body and would
    // otherwise leave an orphaned keypad open.
    closeKeyboard();
    props.onSelectInstance(instance);
  };

  return (
    // Auto-height: the sheet hugs the content; the nested fit-content keyboard host adds
    // inline space below when the keypad opens, growing the sheet. The cap keeps the whole
    // sheet (including the docked keypad, which renders below this view) within the screen —
    // past it, the editor is the part that shrinks and scrolls. The system-keyboard spacer
    // lives inside this view, so it needs no subtraction here.
    <View style={{ maxHeight: Math.max(windowHeight * 0.25, windowHeight * 0.9 - keypadHeight - insets.bottom) }}>
      <View style={{ flexShrink: 1 }}>
        <View className="flex-row items-center gap-2 px-4 pb-2 border-b border-border-neutral">
          <View className="flex-1">
            {props.instances.length > 1 ? (
              <FadeScrollView className="mb-1" contentClassName="gap-1" scrollRef={railRef}>
                {props.instances.map((instance) => (
                  <Pressable
                    key={instance.label}
                    onLayout={instance.isSelected ? scrollSelectedIntoView : undefined}
                    className={`px-2 py-0.5 rounded border ${
                      instance.isSelected
                        ? "bg-background-default border-button-primarybackground"
                        : "bg-background-subtle border-background-subtle"
                    }`}
                    onPress={() => selectInstance(instance)}
                  >
                    <Text
                      className="text-xs font-bold text-text-secondary"
                      style={instance.isSelected ? { color: accent } : undefined}
                    >
                      {instance.label}
                    </Text>
                  </Pressable>
                ))}
              </FadeScrollView>
            ) : (
              <Text className="text-xs font-bold text-text-secondary">{props.headerLabel}</Text>
            )}
            {isFreeform ? (
              <Text className="text-sm text-text-secondary">Editing as text</Text>
            ) : (
              <SheetCrumbs controller={controller} />
            )}
          </View>
          {!isFreeform ? (
            <>
              <Pressable className="p-2" onPress={() => controller.walkFocus(-1)}>
                <View style={{ transform: [{ rotate: "180deg" }] }}>
                  <IconArrowRight width={7 * iconScale} height={12 * iconScale} />
                </View>
              </Pressable>
              <Pressable className="p-2" onPress={() => controller.walkFocus(1)}>
                <IconArrowRight width={7 * iconScale} height={12 * iconScale} />
              </Pressable>
            </>
          ) : null}
          {/* Freeform "Apply" folds the text edits back into structured mode (the sheet stays
              open); structured "Save" commits to the program and closes. */}
          <Pressable onPress={isFreeform ? controller.switchToStructured : () => props.onDone(controller.text)}>
            <Text className="text-base font-bold" style={{ color: accent }}>
              {isFreeform ? "Apply" : "Save"}
            </Text>
          </Pressable>
        </View>
        {!isFreeform && (controller.context?.levels ?? []).length > 0 ? (
          <View className="flex-row items-center border-b border-border-neutral">
            <FadeScrollView className="flex-1" contentClassName="gap-2 px-3 py-2">
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
              {controller.pills.length === 0 ? (
                <Text className="text-xs text-text-secondary py-1.5">No actions</Text>
              ) : null}
            </FadeScrollView>
            <View className="flex-row items-center border-l border-border-neutral">
              {(controller.context?.levels ?? []).length > 0 ? (
                <Pressable className="px-4 py-2" onPress={controller.removeFocused}>
                  <IconTrash width={15 * iconScale} height={18 * iconScale} />
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
        {liveError != null ? (
          <View className="px-3 py-2 border-b bg-background-lighterror border-border-neutral">
            <Text className="text-xs font-semibold text-text-error">{liveError.message}</Text>
          </View>
        ) : null}
        {!isFreeform && hint != null && !hintDismissed ? (
          <HintBar hint={hint} onDismiss={() => setHintDismissed(true)} />
        ) : null}
        <ScrollView style={{ flexShrink: 1 }}>
          <View className="px-4 py-3">
            <LiftoEditor
              {...controller.editorProps}
              extraStyledRanges={[...(controller.editorProps.extraStyledRanges ?? []), ...errorStyledRanges]}
            />
          </View>
        </ScrollView>
        {systemKeyboardHeight > 0 ? (
          <View style={{ height: Math.max(0, systemKeyboardHeight - insets.bottom) }} />
        ) : null}
      </View>
    </View>
  );
}
