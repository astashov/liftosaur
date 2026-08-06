import { JSX, useEffect, useRef, useState } from "react";
import { Keyboard, Platform, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackActions, useNavigation, useRoute } from "@react-navigation/native";
import { lb } from "lens-shmens";
import { useAppState } from "../StateContext";
import { useModal, IEditorSheetExercisePickerModalData } from "../ModalStateContext";
import {
  IEvaluatedProgram,
  Program_evaluate,
  Program_getAllProgramExercises,
  Program_getProgram,
  Program_getProgramExercise,
} from "../../models/program";
import { PlannerProgram_evaluate } from "../../pages/planner/models/plannerProgram";
import type { IPlannerEvalResult } from "../../pages/planner/plannerExerciseEvaluator";
import type { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { IState, updateState } from "../../models/state";
import { CollectionUtils_setBy } from "../../utils/collection";
import { Dialog_alert, Dialog_confirm } from "../../utils/dialog";
import type { IDayData, IExercisePickerSelectedExercise, IPlannerProgram } from "../../types";
import type { ILiftoEditorPillCategory } from "../../components/primitives/liftoEditorActions";
import type { IRootStackParamList } from "../types";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { TransparentModal } from "../TransparentModal";
import { CustomKeyboardProvider, useCloseCustomKeyboard } from "../CustomKeyboardContext";
import { LiftoEditor } from "../../components/primitives/liftoEditor";
import type { ILiftoEditorStyledRange } from "../../components/primitives/liftoEditorBrain";
import { ILiftoEditorController, useLiftoEditorController } from "../../components/liftoEditorController";
import { Text } from "../../components/primitives/text";
import { FadeScrollView } from "../../components/fadeScrollView";
import { IconArrowRight } from "../../components/icons/iconArrowRight";
import { IconCloseCircleOutline } from "../../components/icons/iconCloseCircleOutline";
import { IconTrash } from "../../components/icons/iconTrash";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

const sampleText = `# Week 1
## Day 1
Squat / 5x5 / 100kg / progress: lp(5kg)
Bench Press, Barbell / 3x8-10 @8 60s / 80% / warmup: 2x5 45%, 1x3 60%
// A line comment
Deadlift[1-3] / 1x5 / 150kg+ / update: custom() {~ weights += 2.5kg ~}
`;

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
        <IconCloseCircleOutline size={18} />
      </Pressable>
    </Pressable>
  );
}

interface IEditorSheetInstanceOption {
  dayData: Required<IDayData>;
  label: string;
  isSelected: boolean;
}

function EditorSheetBody(props: {
  initialText: string;
  headerLabel: string;
  instances: IEditorSheetInstanceOption[];
  onSelectInstance: (instance: IEditorSheetInstanceOption) => void;
  pickerData?: IEditorSheetExercisePickerModalData;
  onEditReuse?: (targetName: string) => void;
  validateText?: (text: string) => IEditorSheetLiveError | undefined;
  onDone: (text: string) => void;
}): JSX.Element {
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
        });
      },
      editReuse: (targetName) => props.onEditReuse?.(targetName),
    },
  });
  const [hintDismissed, setHintDismissed] = useState(false);
  const [liveError, setLiveError] = useState<IEditorSheetLiveError | undefined>(undefined);
  const validateTextRef = useRef(props.validateText);
  validateTextRef.current = props.validateText;
  const liveErrorText = controller.text;
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
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const systemKeyboardHeight = useSystemKeyboardHeight();
  const closeKeyboard = useCloseCustomKeyboard();
  const isFreeform = controller.mode === "freeform";

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
    // inline space below when the keypad opens, growing the sheet.
    <View>
      <View>
        <View className="flex-row items-center gap-2 px-4 pb-2 border-b border-border-neutral">
          <View className="flex-1">
            {props.instances.length > 1 ? (
              <FadeScrollView className="mb-1" contentClassName="gap-1">
                {props.instances.map((instance) => (
                  <Pressable
                    key={instance.label}
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
                  <IconArrowRight />
                </View>
              </Pressable>
              <Pressable className="p-2" onPress={() => controller.walkFocus(1)}>
                <IconArrowRight />
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
                  <IconTrash width={15} height={18} />
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
        <ScrollView style={{ maxHeight: windowHeight * 0.45 }}>
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

// Where the exercise's source text physically lives: repeat instances carry the
// declaration's text/line but their own dayData, so anchor edits to the non-repeat
// declaration that repeats into the opened week.
function findDeclaration(
  evaluatedProgram: IEvaluatedProgram,
  programExercise: IPlannerProgramExercise
): IPlannerProgramExercise {
  if (!programExercise.isRepeat) {
    return programExercise;
  }
  return (
    Program_getAllProgramExercises(evaluatedProgram).find(
      (e) => e.key === programExercise.key && !e.isRepeat && e.repeating.includes(programExercise.dayData.week)
    ) ?? programExercise
  );
}

// Identical exercise lines commonly appear in several weeks (repeated weeks written out),
// so the replacement must target the declaration's exact day and line, not the first
// occurrence anywhere in the planner.
function replaceExerciseTextInPlanner(
  planner: IPlannerProgram,
  declaration: IPlannerProgramExercise,
  oldText: string,
  newText: string
): { planner: IPlannerProgram; dayTextOffset: number } | undefined {
  const weekIndex = declaration.dayData.week - 1;
  const dayIndex = declaration.dayData.dayInWeek - 1;
  const day = planner.weeks[weekIndex]?.days[dayIndex];
  if (day == null) {
    return undefined;
  }
  const lineStart = day.exerciseText
    .split("\n")
    .slice(0, declaration.line - 1)
    .reduce((sum, l) => sum + l.length + 1, 0);
  const at = day.exerciseText.indexOf(oldText, lineStart);
  if (at === -1) {
    return undefined;
  }
  const newExerciseText = day.exerciseText.slice(0, at) + newText + day.exerciseText.slice(at + oldText.length);
  const newWeeks = planner.weeks.map((w, wi) =>
    wi === weekIndex
      ? { ...w, days: w.days.map((d, di) => (di === dayIndex ? { ...d, exerciseText: newExerciseText } : d)) }
      : w
  );
  return { planner: { ...planner, weeks: newWeeks }, dayTextOffset: at };
}

interface IEditorSheetLiveError {
  message: string;
  from?: number;
  to?: number;
}

function cleanErrorMessage(message: string): string {
  return message.replace(/\s*\(\d+:\d+\)$/, "");
}

// Errors inside the edited exercise come back with blurb-local from/to (so the sheet can
// tint the line); errors elsewhere (e.g. the edit broke a `...reuse` on another day) are
// message-only, prefixed with where they are.
function findEvalError(
  evaluatedWeeks: IPlannerEvalResult[][],
  edited: { weekIndex: number; dayIndex: number; from: number; to: number }
): IEditorSheetLiveError | undefined {
  let firstOutside: IEditorSheetLiveError | undefined;
  for (let wi = 0; wi < evaluatedWeeks.length; wi += 1) {
    for (let di = 0; di < evaluatedWeeks[wi].length; di += 1) {
      const result = evaluatedWeeks[wi][di];
      if (!result.success) {
        const error = result.error;
        const isInEdited =
          wi === edited.weekIndex && di === edited.dayIndex && error.from >= edited.from && error.to <= edited.to;
        if (isInEdited) {
          return {
            message: cleanErrorMessage(error.message),
            from: error.from - edited.from,
            to: error.to - edited.from,
          };
        }
        firstOutside = firstOutside ?? {
          message: `Week ${wi + 1}, Day ${di + 1}: ${cleanErrorMessage(error.message)}`,
        };
      }
    }
  }
  return firstOutside;
}

export function NavModalEditorSheet(): JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<{ key: string; name: "editorSheetModal"; params: IRootStackParamList["editorSheetModal"] }>();
  const params = route.params;
  const { state, dispatch } = useAppState();
  // Snapshot the exercise on open: the controller only reads initialText once, and
  // re-evaluating the program on every state change would waste work while the sheet is up.
  // Saving must NOT use this — onDone re-resolves from the current state at commit time.
  const [snapshot] = useState(() => {
    if (params == null) {
      return undefined;
    }
    const program = Program_getProgram(state, params.programId);
    if (program == null) {
      return undefined;
    }
    const evaluatedProgram = Program_evaluate(program, state.storage.settings);
    const programExercise = Program_getProgramExercise(params.dayData.day, evaluatedProgram, params.key);
    if (programExercise == null) {
      return undefined;
    }
    // One entry per declaration: repeat instances share the declaration's text, so a chip
    // per repeated week would be several ways to edit the same source line.
    const instances = Program_getAllProgramExercises(evaluatedProgram).filter(
      (e) => e.key === params.key && !e.isRepeat
    );
    return {
      evaluatedProgram,
      programExercise,
      instances,
      initialDayData: findDeclaration(evaluatedProgram, programExercise).dayData,
    };
  });
  const [selectedDayData, setSelectedDayData] = useState(snapshot?.initialDayData ?? params?.dayData);
  const currentExercise =
    snapshot != null && selectedDayData != null
      ? (snapshot.instances.find(
          (e) => e.dayData.week === selectedDayData.week && e.dayData.dayInWeek === selectedDayData.dayInWeek
        ) ?? snapshot.programExercise)
      : undefined;

  const onClose = (): void => {
    navigation.goBack();
  };

  // Pushes a second editor sheet for the reuse target on top of this one, so Done/close
  // pops back to the referring exercise.
  const onEditReuse = (targetName: string): void => {
    if (snapshot == null || params == null) {
      return;
    }
    const target = Program_getAllProgramExercises(snapshot.evaluatedProgram).find(
      (e) => e.fullName === targetName || e.name === targetName || e.key === targetName
    );
    if (target == null) {
      Dialog_alert(`Couldn't find "${targetName}" in this program.`);
      return;
    }
    navigation.dispatch(
      StackActions.push("editorSheetModal", { programId: params.programId, key: target.key, dayData: target.dayData })
    );
  };

  const onDone = (newText: string): void => {
    const trimmed = newText.trim();
    if (params == null || snapshot == null || currentExercise == null || trimmed === currentExercise.text) {
      onClose();
      return;
    }
    if (trimmed === "") {
      Dialog_alert("The exercise text is empty. Delete the exercise from the program screen instead.");
      return;
    }
    // Re-resolve from the current state, not the open-time snapshot: a stacked reuse sheet
    // can save this same program while this sheet is up, and writing the snapshot's program
    // back would silently revert that save.
    const program = Program_getProgram(state, params.programId);
    if (program?.planner == null) {
      Dialog_alert("Couldn't find this program anymore, so the changes weren't saved.");
      onClose();
      return;
    }
    const evaluatedProgram = Program_evaluate(program, state.storage.settings);
    const programExercise = Program_getProgramExercise(currentExercise.dayData.day, evaluatedProgram, params.key);
    const declaration = programExercise != null ? findDeclaration(evaluatedProgram, programExercise) : undefined;
    const replaced =
      declaration != null
        ? replaceExerciseTextInPlanner(program.planner, declaration, declaration.text, trimmed)
        : undefined;
    if (declaration == null || replaced == null) {
      Dialog_alert("Couldn't find this exercise in the program anymore, so the changes weren't saved.");
      onClose();
      return;
    }
    const { evaluatedWeeks } = PlannerProgram_evaluate(replaced.planner, state.storage.settings);
    const evalError = findEvalError(evaluatedWeeks, {
      weekIndex: declaration.dayData.week - 1,
      dayIndex: declaration.dayData.dayInWeek - 1,
      from: replaced.dayTextOffset,
      to: replaced.dayTextOffset + trimmed.length,
    });
    if (evalError != null) {
      Dialog_alert(evalError.message);
      return;
    }
    const updatedProgram = { ...program, planner: replaced.planner };
    const lensUpdates = [
      lb<IState>()
        .p("storage")
        .p("programs")
        .recordModify((programs) => CollectionUtils_setBy(programs, "id", updatedProgram.id, updatedProgram)),
    ];
    // Mirror into an open program editor so it doesn't overwrite this edit on its own save.
    if (state.editProgramStates[updatedProgram.id] != null) {
      lensUpdates.push(
        lb<IState>().p("editProgramStates").p(updatedProgram.id).p("current").p("program").record(updatedProgram)
      );
    }
    updateState(dispatch, lensUpdates, "Save program changes");
    onClose();
  };

  // Live validation for the banner/line-tint: splices the draft text into the *current*
  // program and evaluates. The declaration is resolved from the open-time snapshot (one
  // full evaluation per call instead of two); if a stacked reuse sheet changed this very
  // exercise the splice lookup misses and validation just goes quiet — save still
  // re-resolves and re-validates from scratch.
  const validateText = (newText: string): IEditorSheetLiveError | undefined => {
    const trimmed = newText.trim();
    if (params == null || snapshot == null || currentExercise == null || trimmed === "") {
      return undefined;
    }
    const program = Program_getProgram(state, params.programId);
    if (program?.planner == null) {
      return undefined;
    }
    const declaration = findDeclaration(snapshot.evaluatedProgram, currentExercise);
    const replaced = replaceExerciseTextInPlanner(program.planner, declaration, declaration.text, trimmed);
    if (replaced == null) {
      return undefined;
    }
    const { evaluatedWeeks } = PlannerProgram_evaluate(replaced.planner, state.storage.settings);
    const error = findEvalError(evaluatedWeeks, {
      weekIndex: declaration.dayData.week - 1,
      dayIndex: declaration.dayData.dayInWeek - 1,
      from: replaced.dayTextOffset,
      to: replaced.dayTextOffset + trimmed.length,
    });
    if (error?.from != null && error.to != null) {
      // The splice uses the trimmed text while the editor shows the untrimmed draft.
      const leading = newText.length - newText.trimStart().length;
      return { ...error, from: error.from + leading, to: error.to + leading };
    }
    return error;
  };

  const initialText = currentExercise?.text ?? sampleText;
  const dayData = selectedDayData ?? params?.dayData;
  const headerLabel = dayData != null ? `WK ${dayData.week} · DAY ${dayData.dayInWeek}` : "WK 1 · DAY 1";
  const instances: IEditorSheetInstanceOption[] = (snapshot?.instances ?? []).map((e) => ({
    dayData: e.dayData,
    label: `WK ${e.dayData.week} · DAY ${e.dayData.dayInWeek}`,
    isSelected:
      selectedDayData != null &&
      e.dayData.week === selectedDayData.week &&
      e.dayData.dayInWeek === selectedDayData.dayInWeek,
  }));
  const pickerData: IEditorSheetExercisePickerModalData | undefined =
    snapshot != null && params != null && currentExercise != null && dayData != null
      ? {
          exerciseType: currentExercise.exerciseType,
          label: currentExercise.label,
          templateName: currentExercise.exerciseType == null ? currentExercise.name : undefined,
          programId: params.programId,
          dayData,
        }
      : undefined;

  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      <TransparentModal onClose={onClose} fitContent={true}>
        <CustomKeyboardProvider applySafeAreaBottom={false} fitContent={true} noShadow={true}>
          <EditorSheetBody
            // Remount on instance switch: the controller reads initialText only once.
            key={dayData != null ? `${dayData.week}-${dayData.dayInWeek}` : "default"}
            initialText={initialText}
            headerLabel={headerLabel}
            instances={instances}
            onSelectInstance={(instance) => setSelectedDayData(instance.dayData)}
            pickerData={pickerData}
            onEditReuse={onEditReuse}
            validateText={validateText}
            onDone={onDone}
          />
        </CustomKeyboardProvider>
      </TransparentModal>
    </SheetScreenContainer>
  );
}
