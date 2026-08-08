import type { JSX } from "react";
import { useContext, useEffect, useRef } from "react";
import { Keyboard, Platform, View, ScrollView } from "react-native";
import { Directions, Gesture, GestureDetector } from "react-native-gesture-handler";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { LensBuilder, lb } from "lens-shmens";
import { Text } from "../primitives/text";
import { PlannerCodeBlock } from "../../pages/planner/components/plannerCodeBlock";
import { PlannerStatsUtils_dayApproxTimeMs } from "../../pages/planner/models/plannerStatsUtils";
import { IPlannerUi, IPlannerState, IPlannerProgramExercise } from "../../pages/planner/models/types";
import { IPlannerEvalResult } from "../../pages/planner/plannerExerciseEvaluator";
import { IDayData, IExercisePickerSelectedExercise, IPlannerProgram, IPlannerProgramDay, ISettings } from "../../types";
import { IEvaluatedProgram } from "../../models/program";
import { LiftoEditorReuse_candidates } from "../liftoEditorReuse";
import { PlannerKey_fromFullName } from "../../pages/planner/plannerKey";
import type { ILiftoEditorReuseSelection } from "../primitives/liftoEditorActions";
import { useModal } from "../../navigation/ModalStateContext";
import { Dialog_alert } from "../../utils/dialog";
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
import { useSystemKeyboardHeight, useSystemKeyboardHeightFromScreenBottom } from "../../utils/useSystemKeyboardHeight";

// Breathing room between the focused token and whatever is docked below it. Android needs
// more: its caret drags a drop handle that hangs below the line, and clearing only the line
// leaves the handle itself under the keyboard's suggestion strip.
const caretRevealMargin = Platform.OS === "android" ? 32 : 16;

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
  programId: string;
  evaluatedProgram: IEvaluatedProgram;
  dayData: Required<IDayData>;
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
  settings: ISettings;
  programId: string;
  evaluatedProgram: IEvaluatedProgram;
  dayData: Required<IDayData>;
  onChange: (text: string) => void;
  onLineChange: (line: number) => void;
}

function DayEditor(props: IDayEditorProps): JSX.Element {
  // Which of the day's exercises an action is about. The name comes from the editor's own
  // live parse, the key it's matched against from the last evaluation — so right after the
  // name is edited, and until the commit debounce lands, this misses. Missing degrades the
  // pills; matching on position instead would keep working there but silently answer with
  // the wrong exercise whenever a line has been added or removed.
  const evaluatedExercises = props.evaluatedDay.success ? props.evaluatedDay.data : [];
  const exerciseByFullName = (fullName: string | undefined): IPlannerProgramExercise | undefined => {
    if (fullName == null) {
      return undefined;
    }
    const key = PlannerKey_fromFullName(fullName, props.settings.exercises);
    return evaluatedExercises.find((e) => e.key === key);
  };

  // useModal registers its result callback once, but the controller hands a fresh callback
  // per invocation — these refs bridge the two. Several day editors are mounted at once;
  // useModal only delivers a result to the instance that opened the modal.
  const pickerSelectRef = useRef<((selected: IExercisePickerSelectedExercise) => void) | undefined>(undefined);
  const renameSubmitRef = useRef<((value: string) => void) | undefined>(undefined);
  const reuseSelectRef = useRef<
    { items: ILiftoEditorReuseSelection[]; onSelect: (selection: ILiftoEditorReuseSelection) => void } | undefined
  >(undefined);
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
  const openReuseSelect = useModal("inputSelectModal", (value) => {
    const pending = reuseSelectRef.current;
    reuseSelectRef.current = undefined;
    const selection = value != null ? pending?.items.find((item) => item.fullName === value) : undefined;
    if (pending != null && selection != null) {
      pending.onSelect(selection);
    }
  });

  const controller = useLiftoEditorController(props.initialText, {
    surface: "inline",
    exerciseTypeFor: (fullName) => exerciseByFullName(fullName)?.exerciseType,
    actions: {
      pickExercise: (_current, exerciseFullName, onSelect) => {
        pickerSelectRef.current = onSelect;
        const exercise = exerciseByFullName(exerciseFullName);
        openExercisePicker({
          exerciseType: exercise?.exerciseType,
          label: exercise?.label,
          templateName: exercise?.exerciseType == null ? exercise?.name : undefined,
          programId: props.programId,
          dayData: props.dayData,
        });
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
      pickReuse: (kind, exerciseFullName, onSelect) => {
        const exercise = exerciseByFullName(exerciseFullName);
        if (exercise == null) {
          Dialog_alert("Couldn't tell which exercise this is — try again once the program re-evaluates.");
          return;
        }
        const candidates = LiftoEditorReuse_candidates(
          exercise.key,
          !!exercise.notused,
          props.evaluatedProgram,
          props.dayData
        );
        const items: ILiftoEditorReuseSelection[] =
          kind === "sets"
            ? candidates.sets
            : (kind === "progress" ? candidates.progress : candidates.update).map((fullName) => ({ fullName }));
        if (items.length === 0) {
          Dialog_alert(
            kind === "sets"
              ? "There are no other exercises in this program to reuse sets from."
              : "There are no other exercises with their own custom() script to reuse."
          );
          return;
        }
        reuseSelectRef.current = { items, onSelect };
        openReuseSelect({
          name: "editor-inline-reuse",
          values: items.map((item) => [item.fullName, item.fullName]),
          hint:
            kind === "sets"
              ? "You can only reuse sets of exercises that don't reuse other exercises"
              : "You can only reuse scripts that don't reuse other scripts",
        });
      },
    },
  });
  useLiftoEditorFocusClaim(props.focusId, controller);

  const scrollCtx = useContext(NavScreenScrollContext);
  const editorBoxRef = useRef<View>(null);
  const keypadHeight = useCustomKeyboardHeight();
  const systemKeyboardHeight = useSystemKeyboardHeight();
  const systemKeyboardFromScreenBottom = useSystemKeyboardHeightFromScreenBottom();
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  // How much of the scroll area is covered from the bottom. The viewport already ends at the
  // tab bar, so only the part of a keyboard standing above the tab bar eats into it — the
  // same lift the dock itself rides on. The dock is stacked on top of that. Both keyboards
  // have to be measured from the same edge as the tab bar, which pads for the bottom inset.
  const footerHeight = scrollCtx?.footerHeight ?? 0;
  const occluded =
    footerHeight + Math.max(0, keypadHeight - tabBarHeight, systemKeyboardFromScreenBottom - tabBarHeight);
  const occludedRef = useRef(occluded);
  occludedRef.current = occluded;
  // Both boxes are measured in window coordinates so their difference is exact whatever the
  // window's origin is; nothing here is derived from window height or safe-area insets.
  const revealCaret = (rect: { top: number; bottom: number }): void => {
    const scrollNode = scrollCtx?.scrollRef.current;
    const scrollYRef = scrollCtx?.scrollYRef;
    const viewport = scrollCtx?.viewportRef.current;
    const editorBox = editorBoxRef.current;
    if (scrollNode == null || scrollYRef == null || viewport == null || editorBox == null) {
      return;
    }
    viewport.measureInWindow((_vx, vy, _vw, vh) => {
      editorBox.measureInWindow((_x, y) => {
        const visibleBottom = vy + vh - occludedRef.current - caretRevealMargin;
        const caretBottom = y + rect.bottom;
        if (caretBottom <= visibleBottom) {
          return;
        }
        scrollNode.scrollTo({ y: Math.max(0, scrollYRef.current + (caretBottom - visibleBottom)), animated: true });
      });
    });
  };

  // Re-asked whenever the occluded strip grows, not just when focus moves: the token can be
  // perfectly visible until the keypad opens under it, and on the first focus the dock is
  // still going from zero to its full height — the rect can come back before that layout
  // lands, so the answer has to be recomputed once the dock has actually measured. Its height
  // varies by token too, since the hint bar and pill rail come and go.
  const focusedLevel = controller.context?.levels[controller.activeLevelIndex];
  const focusStart = focusedLevel?.start;
  const focusEnd = focusedLevel?.end;
  const handleRef = controller.editorProps.handleRef;
  useEffect(() => {
    if (focusStart != null && focusEnd != null) {
      handleRef?.current?.requestCaretRect(focusStart, focusEnd);
    }
  }, [focusStart, focusEnd, keypadHeight, footerHeight, handleRef]);

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

  // Same token-hopping swipes as the editor sheet (swipe right = next). Flings don't fire on
  // taps or on the screen's vertical scroll, so both pass through; freeform turns them off so
  // they don't fight native text selection.
  const walkFling = Gesture.Race(
    Gesture.Fling()
      .direction(Directions.RIGHT)
      .enabled(!isFreeform)
      .runOnJS(true)
      .onStart(() => controller.walkFocus(1)),
    Gesture.Fling()
      .direction(Directions.LEFT)
      .enabled(!isFreeform)
      .runOnJS(true)
      .onStart(() => controller.walkFocus(-1))
  );

  return (
    <View>
      <View
        className="p-2 border rounded-lg"
        style={{ borderColor: error != null ? Tailwind_semantic().text.error : Tailwind_semantic().border.neutral }}
      >
        <GestureDetector gesture={walkFling}>
          <View ref={editorBoxRef}>
            <LiftoEditor
              {...controller.editorProps}
              bottomPadding={isFreeform ? 24 : 0}
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
        </GestureDetector>
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
        settings={props.settings}
        programId={props.programId}
        evaluatedProgram={props.evaluatedProgram}
        dayData={props.dayData}
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
