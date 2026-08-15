import type { JSX, ReactNode } from "react";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Keyboard, LayoutChangeEvent, Platform, View } from "react-native";
import { Directions, Gesture, GestureDetector } from "react-native-gesture-handler";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { Text } from "../primitives/text";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { PlannerSyntaxError } from "../../pages/planner/plannerExerciseEvaluator";
import { IDayData, IExercisePickerSelectedExercise, IExerciseType, ISettings } from "../../types";
import { IEvaluatedProgram, Program_getAllProgramExercises } from "../../models/program";
import { LiftoEditorReuse_candidates } from "../liftoEditorReuse";
import { PlannerKey_fromFullName } from "../../pages/planner/plannerKey";
import { ILiftoEditorReuseSelection, LiftoEditorActions_renamePrompt } from "../primitives/liftoEditorActions";
import { LiftoEditorStateVars_contextFor } from "../primitives/liftoEditorStateVars";
import { useModal } from "../../navigation/ModalStateContext";
import { Dialog_alert } from "../../utils/dialog";
import { LiftoEditor } from "../primitives/liftoEditor";
import type { ILiftoEditorStyledRange } from "../primitives/liftoEditorBrain";
import { useLiftoEditorController } from "../liftoEditorController";
import { useLiftoEditorFocusClaim } from "../liftoEditorFocus";
import { useLiftoEditorReorder } from "../liftoEditorReorder";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { NavScreenScrollContext } from "../../navigation/NavScreenScrollContext";
import { useCustomKeyboardHeight } from "../../navigation/CustomKeyboardContext";
import { useSystemKeyboardHeight, useSystemKeyboardHeightFromScreenBottom } from "../../utils/useSystemKeyboardHeight";

// Breathing room between the focused token and whatever is docked below it. Android needs
// more: its caret drags a drop handle that hangs below the line, and clearing only the line
// leaves the handle itself under the keyboard's suggestion strip.
const caretRevealMargin = Platform.OS === "android" ? 32 : 16;
// CustomKeyboardProvider's open animation, plus a frame for the taller content to lay out.
const keypadOpenDuration = 300;

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i += 1) {
    if (text[i] === "\n") {
      line += 1;
    }
  }
  return line;
}

interface IStickyErrorProps {
  message?: string;
  children: ReactNode;
}

// The error rides along the top edge of the document it belongs to, staying put while any part
// of that document is on screen — an editor can be several screens tall, and an error parked at
// its far end is out of sight exactly while you're typing the line that caused it. RN has no
// position:sticky, and the ScrollView's own sticky headers only apply to its direct children,
// so this follows the scroll offset by hand.
function StickyError(props: IStickyErrorProps): JSX.Element {
  const scrollCtx = useContext(NavScreenScrollContext);
  const containerRef = useRef<View>(null);
  const bannerHeightRef = useRef(0);
  const stickyHeaderHeight = scrollCtx?.stickyHeaderHeight ?? 0;
  // Where the document starts in scroll-content coordinates, and how far the banner may travel
  // before it would outrun the document's bottom edge.
  const [anchor, setAnchor] = useState({ top: 0, range: 0 });

  // Both boxes in window coordinates, turned into a content offset with the scroll position
  // that was live at the same moment — on Android edge-to-edge the window and measureInWindow
  // don't share an origin, so nothing here may come from window height or insets.
  const remeasure = useCallback(() => {
    const viewport = scrollCtx?.viewportRef.current;
    const container = containerRef.current;
    if (viewport == null || container == null) {
      return;
    }
    viewport.measureInWindow((_vx, vy) => {
      container.measureInWindow((_x, y, _w, height) => {
        const top = y - vy + (scrollCtx?.scrollYRef.current ?? 0);
        const range = Math.max(0, height - bannerHeightRef.current);
        setAnchor((prev) => (prev.top === top && prev.range === range ? prev : { top, range }));
      });
    });
  }, [scrollCtx]);

  // The container's own onLayout covers everything below it moving, but not an ancestor resizing
  // above it — that leaves this editor where it was relative to its parent. A changed content
  // height is the one signal that catches both.
  const contentHeightRef = useRef(0);
  useEffect(() => {
    return scrollCtx?.addScrollListener((e) => {
      const contentHeight = e.nativeEvent.contentSize.height;
      if (contentHeight !== contentHeightRef.current) {
        contentHeightRef.current = contentHeight;
        remeasure();
      }
    });
  }, [scrollCtx, remeasure]);

  const onBannerLayout = (e: LayoutChangeEvent): void => {
    bannerHeightRef.current = e.nativeEvent.layout.height;
    remeasure();
  };

  // Interpolated rather than followed in JS: the scroll listeners run a frame or two behind
  // the scroll itself, which the eye reads as the banner drifting away from the top edge
  // whenever you flick.
  const scrollAnimatedY = scrollCtx?.scrollAnimatedY;
  const translateY = useMemo(() => {
    const pinnedAt = anchor.top - stickyHeaderHeight;
    if (scrollAnimatedY == null || anchor.range <= 0) {
      return 0;
    }
    return scrollAnimatedY.interpolate({
      inputRange: [pinnedAt, pinnedAt + anchor.range],
      outputRange: [0, anchor.range],
      extrapolate: "clamp",
    });
  }, [scrollAnimatedY, anchor, stickyHeaderHeight]);

  return (
    <View ref={containerRef} onLayout={remeasure}>
      {props.message != null ? (
        // Drawn over the editor rather than pushing it: once pinned it has to cover whatever
        // line it has slid down onto, so it needs the raised order and an opaque background.
        <Animated.View
          className="px-2 py-1 mb-1 bg-background-lighterror"
          style={{ transform: [{ translateY }], zIndex: 1 }}
          onLayout={onBannerLayout}
        >
          <Text className="text-xs font-semibold text-text-error">{props.message}</Text>
        </Animated.View>
      ) : null}
      {props.children}
    </View>
  );
}

// The day an action is about, and that day's exercises as of the last evaluation.
export interface IEditProgramLiftoEditorContext {
  dayData: Required<IDayData>;
  exercises: IPlannerProgramExercise[];
}

interface IEditProgramLiftoEditorProps {
  // The document, from whoever owns it. Read once to seed the editor; after that a value that
  // isn't what this editor last committed is treated as an edit from elsewhere (undo/redo, a
  // change made on another surface) and applied as one.
  text: string;
  focusId: string;
  settings: ISettings;
  evaluatedProgram: IEvaluatedProgram;
  // Offsets are relative to this editor's own document, so its own numbering is what the
  // error's line refers to.
  error?: PlannerSyntaxError;
  // Equipment for weight stepping. Answered without an offset because the controller asks
  // while focus is crossing into the exercise, before this component has re-rendered.
  exerciseTypeFor: (exerciseFullName: string) => IExerciseType | undefined;
  // A constant when the document is one day; in full-program mode the caret decides.
  contextAt: (offset: number) => IEditProgramLiftoEditorContext;
  onChange: (text: string) => void;
  onLineChange?: (line: number) => void;
}

// A LiftoEditor wired for the Program screen: it claims the screen's dock while focused,
// keeps the focused token clear of whatever keyboard is up, commits its text on a debounce,
// and routes the pills' modals. The document is a day in per-day mode and the whole program
// in full mode — everything day-specific arrives through contextAt.
//
// Native-only despite the file name: it's imported from the .native.tsx hosts, and LiftoEditor
// itself throws on web.
export function EditProgramLiftoEditor(props: IEditProgramLiftoEditorProps): JSX.Element {
  // useModal registers its result callback once, but the controller hands a fresh callback
  // per invocation — these refs bridge the two. Several editors are mounted at once; useModal
  // only delivers a result to the instance that opened the modal.
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
  const stateVarsApplyRef = useRef<((args: string) => void) | undefined>(undefined);
  const openStateVars = useModal("stateVarsModal", (args) => {
    const onApply = stateVarsApplyRef.current;
    stateVarsApplyRef.current = undefined;
    if (args != null && onApply != null) {
      onApply(args);
    }
  });

  // Where the focus sits, for the actions to ask which day they're in. Kept in a ref because
  // the pills fire from the dock, a render after focus moved.
  const focusOffsetRef = useRef(0);
  const contextAtRef = useRef(props.contextAt);
  contextAtRef.current = props.contextAt;
  const settingsRef = useRef(props.settings);
  settingsRef.current = props.settings;
  const evaluatedProgramRef = useRef(props.evaluatedProgram);
  evaluatedProgramRef.current = props.evaluatedProgram;
  // The name comes from the editor's own live parse, the key it's matched against from the
  // last evaluation — so right after the name is edited, and until the commit debounce lands,
  // this misses. Missing degrades the pills; matching on position instead would keep working
  // there but silently answer with the wrong exercise whenever a line has been added or
  // removed.
  const focusedExercise = (fullName: string | undefined): IPlannerProgramExercise | undefined => {
    if (fullName == null) {
      return undefined;
    }
    const key = PlannerKey_fromFullName(fullName, settingsRef.current.exercises);
    return contextAtRef.current(focusOffsetRef.current).exercises.find((e) => e.key === key);
  };

  const controller = useLiftoEditorController(props.text, {
    surface: "inline",
    exerciseTypeFor: props.exerciseTypeFor,
    actions: {
      pickExercise: (_current, exerciseFullName, onSelect) => {
        pickerSelectRef.current = onSelect;
        const exercise = focusedExercise(exerciseFullName);
        openExercisePicker({
          exerciseType: exercise?.exerciseType,
          label: exercise?.label,
          templateName: exercise?.exerciseType == null ? exercise?.name : undefined,
          evaluatedProgram: evaluatedProgramRef.current,
          dayData: contextAtRef.current(focusOffsetRef.current).dayData,
        });
      },
      promptRename: (current, kind, onSubmit) => {
        renameSubmitRef.current = onSubmit;
        openRename(LiftoEditorActions_renamePrompt(current, kind));
      },
      pickReuse: (kind, exerciseFullName, onSelect) => {
        const exercise = focusedExercise(exerciseFullName);
        if (exercise == null) {
          Dialog_alert("Couldn't tell which exercise this is — try again once the program re-evaluates.");
          return;
        }
        const candidates = LiftoEditorReuse_candidates(
          exercise.key,
          !!exercise.notused,
          evaluatedProgramRef.current,
          contextAtRef.current(focusOffsetRef.current).dayData
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
      editStateVars: (target, exerciseFullName, onApply) => {
        stateVarsApplyRef.current = onApply;
        openStateVars({
          // A reuse target names an exercise anywhere in the program, not just this day's.
          ...LiftoEditorStateVars_contextFor(
            target,
            focusedExercise(exerciseFullName),
            Program_getAllProgramExercises(evaluatedProgramRef.current),
            settingsRef.current
          ),
          entries: target.entries,
          hasUnparsed: target.hasUnparsed,
          exerciseType: exerciseFullName != null ? props.exerciseTypeFor(exerciseFullName) : undefined,
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
    if (focusStart == null || focusEnd == null) {
      return;
    }
    handleRef?.current?.requestCaretRect(focusStart, focusEnd);
    // Asked again once the keypad has finished opening: the scroll spacer that makes room for
    // it grows over that same animation, so a token near the end of the content has nowhere to
    // scroll to yet and scrollTo clamps short of the keypad. By then the answer is usually
    // "already visible", so this second pass is a no-op everywhere else.
    const timer = setTimeout(() => handleRef?.current?.requestCaretRect(focusStart, focusEnd), keypadOpenDuration);
    return () => clearTimeout(timer);
  }, [focusStart, focusEnd, keypadHeight, footerHeight, handleRef]);

  // Freeform has no focus stack — the caret is the native selection, so follow that instead.
  const isFreeform = controller.mode === "freeform";
  // Press and hold an exercise to move it within the day. Off in freeform, where a long press
  // is the system's own text selection.
  const reorder = useLiftoEditorReorder({
    text: controller.text,
    parseCache: controller.editorProps.parseCache,
    handleRef: controller.editorProps.handleRef,
    isEnabled: !isFreeform,
    onBeforeReorder: () => controller.blur(),
  });
  // Every way out of freeform ends with the keyboard going away — the dock is hidden there,
  // so it's scroll-to-dismiss on iOS and the back button on Android. Treat that as the exit
  // rather than giving each path its own handler.
  //
  // Dropping focus is the point: switchToStructured alone only flips the mode and leaves the
  // level stack empty, which brings the dock back in its "Tap a token to focus" state. The
  // mode still has to come back with it, or the editor stays editable and the next tap goes
  // straight to text entry with no way back to the structured UI.
  //
  // evict rather than blur, and this editor's rather than the screen's: the keyboard also goes
  // away when another editor takes over, and by then that editor holds the dock and has the
  // keypad open on its own token — a blur here would close both out from under it.
  const exitFreeformRef = useRef<() => void>(() => undefined);
  exitFreeformRef.current = () => controller.evict();
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
  const committedRef = useRef(props.text);
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

  // Text from elsewhere, applied through the same channel as a pill edit rather than by
  // remounting: the native view keeps its scroll and only the changed lines redraw, where a
  // remount blinks the whole editor. Anything this editor committed itself comes back through
  // this same prop and is not an external edit. Whatever the caret was on is likely gone with
  // the old text, so focus is dropped first.
  const blurRef = useRef(controller.blur);
  blurRef.current = controller.blur;
  const externalText = props.text;
  useEffect(() => {
    if (externalText === committedRef.current || externalText === textRef.current) {
      return;
    }
    const live = textRef.current;
    let start = 0;
    while (start < live.length && start < externalText.length && live[start] === externalText[start]) {
      start += 1;
    }
    let liveEnd = live.length;
    let externalEnd = externalText.length;
    while (liveEnd > start && externalEnd > start && live[liveEnd - 1] === externalText[externalEnd - 1]) {
      liveEnd -= 1;
      externalEnd -= 1;
    }
    committedRef.current = externalText;
    blurRef.current();
    handleRef?.current?.replaceRange(start, liveEnd, externalText.slice(start, externalEnd));
  }, [externalText, handleRef]);

  const onLineChangeRef = useRef(props.onLineChange);
  onLineChangeRef.current = props.onLineChange;
  const anchor = controller.context?.levels[0]?.start;
  focusOffsetRef.current = anchor ?? 0;
  useEffect(() => {
    if (anchor != null) {
      onLineChangeRef.current?.(lineAt(textRef.current, anchor));
    }
  }, [anchor]);

  // The error already carries offsets into this document. It lags the editor by the commit
  // debounce, hence the clamp.
  const errorStyledRanges: ILiftoEditorStyledRange[] = [];
  const error = props.error;
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
  //
  // Memoized, and reading the walk through a ref: a drag re-renders this component as it runs
  // (the drop target changes), and handing the detector a freshly built gesture tree mid-drag
  // is how a drag loses its state halfway down the day.
  const walkFocusRef = useRef(controller.walkFocus);
  walkFocusRef.current = controller.walkFocus;
  const reorderGesture = reorder.gesture;
  const gesture = useMemo(
    () =>
      Gesture.Race(
        // A press-and-hold beats the flings, since neither can activate without movement first.
        reorderGesture,
        Gesture.Fling()
          .direction(Directions.RIGHT)
          .enabled(!isFreeform)
          .runOnJS(true)
          .onStart(() => walkFocusRef.current(1)),
        Gesture.Fling()
          .direction(Directions.LEFT)
          .enabled(!isFreeform)
          .runOnJS(true)
          .onStart(() => walkFocusRef.current(-1))
      ),
    [reorderGesture, isFreeform]
  );

  return (
    <StickyError message={error?.message}>
      <View
        className="p-2 border rounded-lg"
        style={{ borderColor: error != null ? Tailwind_semantic().text.error : Tailwind_semantic().border.neutral }}
      >
        <GestureDetector gesture={gesture}>
          <View ref={editorBoxRef}>
            <LiftoEditor
              {...controller.editorProps}
              // The eval error quotes a line, and this editor's document is exactly what that
              // line was counted against, so its own numbering is what it refers to.
              showLineNumbers={true}
              bottomPadding={isFreeform ? 24 : 0}
              extraStyledRanges={[
                ...(controller.editorProps.extraStyledRanges ?? []),
                ...errorStyledRanges,
                ...reorder.styledRanges,
              ]}
              onCaretRect={revealCaret}
              onRangeRects={reorder.onRangeRects}
              onSelectionChange={(start, end) => {
                lastSelectionRef.current = { start, end };
                if (isFreeform) {
                  handleRef?.current?.requestCaretRect(start, end);
                }
              }}
            />
            {reorder.overlay}
          </View>
        </GestureDetector>
      </View>
    </StickyError>
  );
}
