import type { JSX } from "react";
import { useContext, useEffect, useRef } from "react";
import { Keyboard, View, ScrollView, useWindowDimensions } from "react-native";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { LensBuilder, lb } from "lens-shmens";
import { Text } from "../primitives/text";
import { PlannerCodeBlock } from "../../pages/planner/components/plannerCodeBlock";
import { PlannerStatsUtils_dayApproxTimeMs } from "../../pages/planner/models/plannerStatsUtils";
import { IPlannerUi, IPlannerState, IPlannerProgramExercise } from "../../pages/planner/models/types";
import { IPlannerEvalResult } from "../../pages/planner/plannerExerciseEvaluator";
import { IPlannerProgram, IPlannerProgramDay, ISettings } from "../../types";
import { CollectionUtils_findIndexReverse } from "../../utils/collection";
import { TimeUtils_formatHHMM } from "../../utils/time";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IconWatch } from "../icons/iconWatch";
import { LiftoEditor } from "../primitives/liftoEditor";
import type { ILiftoEditorStyledRange } from "../primitives/liftoEditorBrain";
import { useLiftoEditorController } from "../liftoEditorController";
import { useLiftoEditorBlurFocused, useLiftoEditorFocusClaim } from "../liftoEditorFocus";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { NavScreenScrollContext } from "../../navigation/NavScreenScrollContext";
import { useCustomKeyboardHeight } from "../../navigation/CustomKeyboardContext";
import { useSystemKeyboardHeight } from "../../utils/useSystemKeyboardHeight";

// Breathing room between the focused token and the top of the docked chrome.
const caretRevealMargin = 16;

interface IEditProgramV2TextExercisesProps {
  exerciseFullNames: string[];
  settings: ISettings;
  evaluatedDay: IPlannerEvalResult;
  plannerDay: IPlannerProgramDay;
  dayIndex: number;
  ui: IPlannerUi;
  plannerDispatch: ILensDispatch<IPlannerState>;
  weekIndex: number;
  lbProgram: LensBuilder<IPlannerState, IPlannerProgram, {}, undefined>;
}

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i += 1) {
    if (text[i] === "\n") {
      line += 1;
    }
  }
  return line;
}

interface IDayEditorProps {
  initialText: string;
  focusId: string;
  evaluatedDay: IPlannerEvalResult;
  onChange: (text: string) => void;
  onLineChange: (line: number) => void;
}

function DayEditor(props: IDayEditorProps): JSX.Element {
  const controller = useLiftoEditorController(props.initialText);
  useLiftoEditorFocusClaim(props.focusId, controller);

  const scrollCtx = useContext(NavScreenScrollContext);
  const editorBoxRef = useRef<View>(null);
  const keypadHeight = useCustomKeyboardHeight();
  const systemKeyboardHeight = useSystemKeyboardHeight();
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const { height: windowHeight } = useWindowDimensions();
  // The dock is anchored to the footer slot and rides above the keypad, so together they
  // occlude the footer's height plus whichever of the keypad/tab bar is taller.
  const occludedRef = useRef(0);
  occludedRef.current =
    (scrollCtx?.footerHeightRef.current ?? 0) + Math.max(tabBarHeight, keypadHeight, systemKeyboardHeight);
  const revealCaret = (rect: { top: number; bottom: number }): void => {
    const scrollNode = scrollCtx?.scrollRef.current;
    const scrollYRef = scrollCtx?.scrollYRef;
    const editorBox = editorBoxRef.current;
    if (scrollNode == null || scrollYRef == null || editorBox == null) {
      return;
    }
    editorBox.measureInWindow((_x, y) => {
      const visibleBottom = windowHeight - occludedRef.current - caretRevealMargin;
      const caretBottom = y + rect.bottom;
      if (caretBottom <= visibleBottom) {
        return;
      }
      scrollNode.scrollTo({ y: Math.max(0, scrollYRef.current + (caretBottom - visibleBottom)), animated: true });
    });
  };

  // Re-asked when the keypad opens too: the focused token can be fine until the keypad
  // grows the occluded strip underneath it.
  const focusedLevel = controller.context?.levels[controller.activeLevelIndex];
  const focusStart = focusedLevel?.start;
  const focusEnd = focusedLevel?.end;
  const handleRef = controller.editorProps.handleRef;
  useEffect(() => {
    if (focusStart != null && focusEnd != null) {
      handleRef?.current?.requestCaretRect(focusStart, focusEnd);
    }
  }, [focusStart, focusEnd, keypadHeight, handleRef]);

  // Freeform has no focus stack — the caret is the native selection, so follow that instead.
  const isFreeform = controller.mode === "freeform";
  // Every way out of freeform ends with the keyboard going away — the dock is hidden there,
  // so it's scroll-to-dismiss on iOS and the back button on Android. Treat that as the exit
  // rather than giving each path its own handler.
  //
  // Dropping focus is the point: switchToStructured alone only flips the mode and leaves the
  // level stack empty, which brings the dock back in its "Tap a token to focus" state. The
  // mode still has to come back with it, or the editor stays editable and the next tap goes
  // straight to text entry with no way back to the structured UI.
  const blurFocused = useLiftoEditorBlurFocused();
  const exitFreeformRef = useRef<() => void>(() => undefined);
  exitFreeformRef.current = () => {
    controller.switchToStructured();
    blurFocused();
  };
  // Only after the keyboard has actually appeared: entering freeform flips this flag ~50ms
  // before the caret placement summons the IME (the controller waits for the native side to
  // commit `editable` first), and a hide event landing in that window — a stale one, or the
  // custom keypad closing on the way in — would bounce straight back out.
  useEffect(() => {
    if (!isFreeform) {
      return;
    }
    let hasShown = false;
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      hasShown = true;
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      if (hasShown) {
        exitFreeformRef.current();
      }
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [isFreeform]);
  const lastSelectionRef = useRef<{ start: number; end: number } | undefined>(undefined);
  useEffect(() => {
    const selection = lastSelectionRef.current;
    if (isFreeform && selection != null) {
      handleRef?.current?.requestCaretRect(selection.start, selection.end);
    }
  }, [isFreeform, systemKeyboardHeight, handleRef]);

  const textRef = useRef(controller.text);
  textRef.current = controller.text;
  const onChangeRef = useRef(props.onChange);
  onChangeRef.current = props.onChange;
  // Committing on every keystroke re-evaluates the whole program (and re-renders every day
  // card, since a fresh evaluation produces all-new objects). Structured pill edits still
  // land within one debounce window.
  const committedRef = useRef(props.initialText);
  const text = controller.text;
  useEffect(() => {
    if (text === committedRef.current) {
      return;
    }
    const timer = setTimeout(() => {
      committedRef.current = text;
      onChangeRef.current(text);
    }, 300);
    return () => clearTimeout(timer);
  }, [text]);

  const onLineChangeRef = useRef(props.onLineChange);
  onLineChangeRef.current = props.onLineChange;
  const anchor = controller.context?.levels[0]?.start;
  useEffect(() => {
    if (anchor != null) {
      onLineChangeRef.current(lineAt(textRef.current, anchor));
    }
  }, [anchor]);

  // The day's own eval error already carries day-relative offsets, so it maps straight onto
  // this document. It lags the editor by the commit debounce, hence the clamp.
  const errorStyledRanges: ILiftoEditorStyledRange[] = [];
  const error = props.evaluatedDay.success ? undefined : props.evaluatedDay.error;
  if (error != null && error.from != null && error.to != null && error.from < text.length) {
    errorStyledRanges.push({
      start: error.from,
      end: Math.min(Math.max(error.to, error.from + 1), text.length),
      backgroundColor: `${Tailwind_semantic().text.error}26`,
    });
  }

  return (
    <View>
      <View
        className="p-2 border rounded-lg"
        style={{ borderColor: error != null ? Tailwind_semantic().text.error : Tailwind_semantic().border.neutral }}
      >
        <View ref={editorBoxRef}>
          <LiftoEditor
            {...controller.editorProps}
            bottomPadding={controller.mode === "freeform" ? 24 : 0}
            extraStyledRanges={[...(controller.editorProps.extraStyledRanges ?? []), ...errorStyledRanges]}
            onCaretRect={revealCaret}
            onSelectionChange={(start, end) => {
              lastSelectionRef.current = { start, end };
              if (isFreeform) {
                handleRef?.current?.requestCaretRect(start, end);
              }
            }}
          />
        </View>
      </View>
      {error != null ? (
        <View className="px-1 pt-1">
          <Text className="text-xs font-semibold text-text-error">{error.message}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function EditProgramV2TextExercises(props: IEditProgramV2TextExercisesProps): JSX.Element {
  const { plannerDay, plannerDispatch, dayIndex, evaluatedDay, lbProgram, weekIndex } = props;
  const focusedExercise = props.ui.focusedExercise;
  const repeats: IPlannerProgramExercise[] = evaluatedDay.success ? evaluatedDay.data.filter((e) => e.isRepeat) : [];
  let approxDayTime: string | undefined;
  if (evaluatedDay.success) {
    approxDayTime = TimeUtils_formatHHMM(
      PlannerStatsUtils_dayApproxTimeMs(evaluatedDay.data, props.settings.timers.workout || 0)
    );
  }
  return (
    <View className="flex-1 w-0 min-w-0">
      <DayEditor
        // The controller reads initialText once, so a day that gets replaced underneath us
        // (clone, reorder, delete) has to remount.
        key={plannerDay.id ?? `${weekIndex}-${dayIndex}`}
        focusId={`day-${weekIndex}-${dayIndex}`}
        initialText={plannerDay.exerciseText}
        evaluatedDay={evaluatedDay}
        onChange={(text) => {
          plannerDispatch(
            lbProgram.p("weeks").i(weekIndex).p("days").i(dayIndex).p("exerciseText").record(text),
            "Update exercise text"
          );
        }}
        onLineChange={(line) => {
          const exerciseIndex =
            dayIndex !== -1 && evaluatedDay.success
              ? CollectionUtils_findIndexReverse(evaluatedDay.data, (d) => d.line <= line)
              : -1;
          const exercise = exerciseIndex !== -1 && evaluatedDay.success ? evaluatedDay.data[exerciseIndex] : undefined;

          if (
            !focusedExercise ||
            focusedExercise.weekIndex !== weekIndex ||
            focusedExercise.dayIndex !== dayIndex ||
            focusedExercise.exerciseLine !== exercise?.line
          ) {
            plannerDispatch(
              lb<IPlannerState>()
                .p("ui")
                .p("focusedExercise")
                .record({ weekIndex, dayIndex, exerciseLine: exercise?.line ?? 0 }),
              "Focus on exercise"
            );
          }
        }}
      />
      {repeats.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-1 ml-8">
          <View>
            {repeats.map((e, i) => (
              <View key={i} className="flex-row">
                <Text className="mr-1">{"•"}</Text>
                <PlannerCodeBlock script={e.text} />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
      {approxDayTime && (
        <View className="flex-row justify-end items-center">
          <IconWatch className="mb-1" />
          <Text className="pl-1 text-xs text-text-secondary">{approxDayTime}</Text>
        </View>
      )}
    </View>
  );
}
