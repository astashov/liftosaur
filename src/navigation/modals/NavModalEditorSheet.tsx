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
import { PlannerProgram_isValid } from "../../pages/planner/models/plannerProgram";
import type { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { IState, updateState } from "../../models/state";
import { CollectionUtils_setBy } from "../../utils/collection";
import { Dialog_alert } from "../../utils/dialog";
import type { IExercisePickerSelectedExercise, IPlannerProgram } from "../../types";
import type { ILiftoEditorPillCategory } from "../../components/primitives/liftoEditorActions";
import type { IRootStackParamList } from "../types";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { TransparentModal } from "../TransparentModal";
import { CustomKeyboardProvider } from "../CustomKeyboardContext";
import { LiftoEditor } from "../../components/primitives/liftoEditor";
import { ILiftoEditorController, useLiftoEditorController } from "../../components/liftoEditorController";
import { Text } from "../../components/primitives/text";
import { IconArrowRight } from "../../components/icons/iconArrowRight";
import { IconCloseCircleOutline } from "../../components/icons/iconCloseCircleOutline";
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

function hintForContext(controller: ILiftoEditorController): { short: string; detail: string } | undefined {
  const levels = controller.context?.levels ?? [];
  const level = levels[controller.activeLevelIndex];
  if (level == null) {
    return undefined;
  }
  if (level.nodeName === "ExerciseExpression") {
    return {
      short: "Exercise: one movement — its warmups, set groups and progression.",
      detail:
        "Sections are separated by '/'. E.g. 'Squat / 3x5 / 100kg / progress: lp(5kg)' — name, sets×reps, weight, progression.",
    };
  }
  if (level.nodeName === "ExerciseProperty" || level.nodeName === "FunctionExpression") {
    return {
      short: "Property: progression, warmups or update logic for this exercise.",
      detail:
        "E.g. 'progress: lp(5kg)' adds 5kg after a successful day, 'warmup: 2x5 45%' defines warmup sets, 'update: custom() {~ ... ~}' runs a script after each set.",
    };
  }
  return {
    short: "Set group: sets × reps, then weight. % here resolve against your 1RM.",
    detail: "E.g. '3x8-10 @8 60s 80%' — 3 sets of 8-10 reps at RPE 8, 60s rest timer, at 80% of your 1RM.",
  };
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

function EditorSheetBody(props: {
  initialText: string;
  headerLabel: string;
  pickerData?: IEditorSheetExercisePickerModalData;
  onEditReuse?: (targetName: string) => void;
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
  const hint = hintForContext(controller);
  const accent = Tailwind_semantic().text.purple;
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const systemKeyboardHeight = useSystemKeyboardHeight();
  const isFreeform = controller.mode === "freeform";

  return (
    // Auto-height: the sheet hugs the content; the nested fit-content keyboard host adds
    // inline space below when the keypad opens, growing the sheet.
    <View>
      <View>
        <View className="flex-row items-center gap-2 px-4 pb-2 border-b border-border-neutral">
          <View className="flex-1">
            <Text className="text-xs font-bold text-text-secondary">{props.headerLabel}</Text>
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
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} className="flex-1">
              <View className="flex-row items-center gap-2 px-3 py-2">
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
              </View>
            </ScrollView>
            <View className="flex-row items-center border-l border-border-neutral">
              {(controller.context?.levels ?? []).length > 0 ? (
                <Pressable className="pl-2 py-1" onPress={controller.removeFocused}>
                  <IconCloseCircleOutline />
                </Pressable>
              ) : null}
              <View className="px-2 py-1">
                <Text className="text-base font-bold text-text-secondary">⋮</Text>
              </View>
            </View>
          </View>
        ) : null}
        {!isFreeform && hint != null && !hintDismissed ? (
          <HintBar hint={hint} onDismiss={() => setHintDismissed(true)} />
        ) : null}
        <ScrollView style={{ maxHeight: windowHeight * 0.45 }}>
          <View className="px-4 py-3">
            <LiftoEditor {...controller.editorProps} />
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
): IPlannerProgram | undefined {
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
  return { ...planner, weeks: newWeeks };
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
    return programExercise != null ? { evaluatedProgram, programExercise } : undefined;
  });

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
    if (params == null || snapshot == null || trimmed === snapshot.programExercise.text) {
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
    const programExercise = Program_getProgramExercise(params.dayData.day, evaluatedProgram, params.key);
    const declaration = programExercise != null ? findDeclaration(evaluatedProgram, programExercise) : undefined;
    const newPlanner =
      declaration != null
        ? replaceExerciseTextInPlanner(program.planner, declaration, declaration.text, trimmed)
        : undefined;
    if (newPlanner == null) {
      Dialog_alert("Couldn't find this exercise in the program anymore, so the changes weren't saved.");
      onClose();
      return;
    }
    if (!PlannerProgram_isValid(newPlanner, state.storage.settings)) {
      Dialog_alert("There's a syntax error in the exercise, fix it before saving.");
      return;
    }
    const updatedProgram = { ...program, planner: newPlanner };
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

  const initialText = snapshot?.programExercise.text ?? sampleText;
  const headerLabel = params != null ? `WK ${params.dayData.week} · DAY ${params.dayData.dayInWeek}` : "WK 1 · DAY 1";
  const pickerData: IEditorSheetExercisePickerModalData | undefined =
    snapshot != null && params != null
      ? {
          exerciseType: snapshot.programExercise.exerciseType,
          label: snapshot.programExercise.label,
          templateName: snapshot.programExercise.exerciseType == null ? snapshot.programExercise.name : undefined,
          programId: params.programId,
          dayData: params.dayData,
        }
      : undefined;

  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      <TransparentModal onClose={onClose} fitContent={true}>
        <CustomKeyboardProvider applySafeAreaBottom={false} fitContent={true} noShadow={true}>
          <EditorSheetBody
            initialText={initialText}
            headerLabel={headerLabel}
            pickerData={pickerData}
            onEditReuse={onEditReuse}
            onDone={onDone}
          />
        </CustomKeyboardProvider>
      </TransparentModal>
    </SheetScreenContainer>
  );
}
