import { JSX, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, Pressable, View } from "react-native";
import { Directions, Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../../components/button";
import { Text } from "../../components/primitives/text";
import { IconHelp } from "../../components/icons/iconHelp";
import { LiftoEditor } from "../../components/primitives/liftoEditor";
import type { ILiftoEditorStyledRange } from "../../components/primitives/liftoEditorBrain";
import { useLiftoEditorController } from "../../components/liftoEditorController";
import { useLiftoEditorModalActions } from "../../components/liftoEditorModalActions";
import { useLiftoEditorReorder } from "../../components/liftoEditorReorder";
import { LiftoEditorReuse_candidates } from "../../components/liftoEditorReuse";
import { LiftoEditorStateVars_contextFor } from "../../components/primitives/liftoEditorStateVars";
import { LiftoEditorHints_forContext } from "../../components/primitives/liftoEditorHints";
import {
  LiftoEditorCrumbs,
  LiftoEditorHintBar,
  LiftoEditorPillRail,
  useLiftoEditorHintDismissed,
} from "../../components/liftoEditorChrome";
import { Program_getAllProgramExercises } from "../../models/program";
import { PlannerKey_fromFullName } from "../../pages/planner/plannerKey";
import type { IPlannerProgramExercise } from "../../pages/planner/models/types";
import type { IDayLiftoEditorSheetProps } from "./dayLiftoEditorSheetTypes";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { useRem } from "../../utils/useRem";
import { useSystemKeyboardHeight } from "../../utils/useSystemKeyboardHeight";
import { useCustomKeyboardHeight } from "../CustomKeyboardContext";
import { SheetDragHandle } from "../TransparentModal";
import { useLiftoEditorSheetLayout } from "./liftoEditorSheetLayout";
import { NavScreenScrollContext } from "../NavScreenScrollContext";
import { useNavScreenScroll } from "../useNavScreenScroll";

// Breathing room between the focused token and the bottom of the scroll area. Android needs
// more: its caret drags a drop handle that hangs below the line.
const caretRevealMargin = Platform.OS === "android" ? 32 : 16;
// CustomKeyboardProvider's open animation, plus a frame for the taller content to lay out.
const keypadOpenDuration = 300;

// The whole day as one Liftoscript document, in a bottom sheet. Same chrome as the
// per-exercise sheet — its own pill rail rather than the Program screen's dock, since the
// screen underneath is covered — and the same editing as the Program screen's day editor,
// drag-to-reorder included.
//
// Deliberately absent, both being about one exercise's relationship to the rest of the
// program rather than about this day: the shared-section fade and its caption, and the
// resolved-reuse preview panel.
export function DayLiftoEditorSheet(props: IDayLiftoEditorSheetProps): JSX.Element {
  const propsRef = useRef(props);
  propsRef.current = props;
  // The name comes from the editor's own live parse, the key it's matched against from the
  // host's last evaluation — so right after a name is edited, and until the commit debounce
  // lands, this misses. Missing degrades the pills; matching on position instead would keep
  // working there but silently answer with the wrong exercise whenever a line moved.
  const focusedExercise = (fullName: string | undefined): IPlannerProgramExercise | undefined => {
    if (fullName == null) {
      return undefined;
    }
    const key = PlannerKey_fromFullName(fullName, propsRef.current.settings.exercises);
    return propsRef.current.exercises.find((e) => e.key === key);
  };

  const actions = useLiftoEditorModalActions({
    reuseSelectName: "day-liftoeditor-reuse",
    pickerDataFor: (exerciseFullName) => {
      const exercise = focusedExercise(exerciseFullName);
      return {
        exerciseType: exercise?.exerciseType,
        label: exercise?.label,
        templateName: exercise?.exerciseType == null ? exercise?.name : undefined,
        evaluatedProgram: propsRef.current.evaluatedProgram,
        dayData: propsRef.current.dayData,
      };
    },
    reuseCandidatesFor: (exerciseFullName) => {
      const exercise = focusedExercise(exerciseFullName);
      return exercise == null
        ? undefined
        : LiftoEditorReuse_candidates(
            exercise.key,
            !!exercise.notused,
            propsRef.current.evaluatedProgram,
            propsRef.current.dayData
          );
    },
    // A reuse target names an exercise anywhere in the program, not just this day's.
    stateVarsContextFor: (target, exerciseFullName) =>
      LiftoEditorStateVars_contextFor(
        target,
        focusedExercise(exerciseFullName),
        Program_getAllProgramExercises(propsRef.current.evaluatedProgram),
        propsRef.current.settings
      ),
    stateVarsExerciseTypeFor: (exerciseFullName) =>
      exerciseFullName != null ? propsRef.current.exerciseTypeFor(exerciseFullName) : undefined,
  });
  const controller = useLiftoEditorController(props.initialText, {
    scope: "day",
    exerciseTypeFor: props.exerciseTypeFor,
    actions,
  });

  const [hintDismissed, setHintDismissed] = useLiftoEditorHintDismissed();
  const isFreeform = controller.mode === "freeform";
  const text = controller.text;
  const onTextChangeRef = useRef(props.onTextChange);
  onTextChangeRef.current = props.onTextChange;
  useEffect(() => {
    onTextChangeRef.current(text);
  }, [text]);
  const onModeChangeRef = useRef(props.onModeChange);
  onModeChangeRef.current = props.onModeChange;
  useEffect(() => {
    onModeChangeRef.current?.(isFreeform ? "freeform" : "structured");
  }, [isFreeform]);

  // Its own scroll context rather than the screen's: a modal covers the screen, so the one
  // NavScreenContent publishes is out of reach here, and without it the reorder drag can't
  // auto-scroll and a focused token can't be scrolled clear of the keyboard. Nothing overlaps
  // the scroll area from below — the keyboard spacer is a sibling that shortens it instead —
  // so there is no footer to account for.
  const { contextValue, scrollRef, viewportRef, onScroll, onLayout, onContentSizeChange } = useNavScreenScroll({
    footerHeight: 0,
    stickyHeaderHeight: 0,
  });

  const editorBoxRef = useRef<View>(null);
  // Both boxes in window coordinates so their difference is exact whatever the window's origin
  // is; on Android edge-to-edge nothing here may be derived from window height or insets.
  const revealCaret = (rect: { top: number; bottom: number }): void => {
    const scrollNode = scrollRef.current;
    const viewport = viewportRef.current;
    const editorBox = editorBoxRef.current;
    if (scrollNode == null || viewport == null || editorBox == null) {
      return;
    }
    viewport.measureInWindow((_vx, vy, _vw, vh) => {
      editorBox.measureInWindow((_x, y) => {
        const visibleBottom = vy + vh - caretRevealMargin;
        const caretBottom = y + rect.bottom;
        if (caretBottom <= visibleBottom) {
          return;
        }
        scrollNode.scrollTo({
          y: Math.max(0, contextValue.scrollYRef.current + (caretBottom - visibleBottom)),
          animated: true,
        });
      });
    });
  };

  // Re-asked whenever the keypad's height changes, not just when focus moves: the token can be
  // perfectly visible until the keypad opens under it, and the sheet's own height shrinks by
  // the same amount at the same time.
  const keypadHeight = useCustomKeyboardHeight();
  const focusedLevel = controller.context?.levels[controller.activeLevelIndex];
  const focusStart = focusedLevel?.start;
  const focusEnd = focusedLevel?.end;
  const handleRef = controller.editorProps.handleRef;
  useEffect(() => {
    if (focusStart == null || focusEnd == null) {
      return;
    }
    handleRef?.current?.requestCaretRect(focusStart, focusEnd);
    // Asked again once the keypad has finished opening: the sheet shrinks over that same
    // animation, so a token near the end of the content has nowhere to scroll to yet and
    // scrollTo clamps short. By then the answer is usually "already visible".
    const timer = setTimeout(() => handleRef?.current?.requestCaretRect(focusStart, focusEnd), keypadOpenDuration);
    return () => clearTimeout(timer);
  }, [focusStart, focusEnd, keypadHeight, handleRef]);

  // Press and hold an exercise to move it within the day. Off in freeform, where a long press
  // is the system's own text selection.
  const reorder = useLiftoEditorReorder({
    text: controller.text,
    parseCache: controller.editorProps.parseCache,
    handleRef: controller.editorProps.handleRef,
    isEnabled: !isFreeform,
    onBeforeReorder: () => controller.blur(),
  });

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

  // Clamp against the current text: the error lags the editor by the host's commit debounce.
  const error = props.error;
  const errorStyledRanges: ILiftoEditorStyledRange[] = [];
  if (error != null && error.from != null && error.to != null && error.from < text.length) {
    errorStyledRanges.push({
      start: error.from,
      end: Math.min(Math.max(error.to, error.from + 1), text.length),
      backgroundColor: `${Tailwind_semantic().text.error}26`,
    });
  }

  const hint = LiftoEditorHints_forContext(controller.context, controller.activeLevelIndex, controller.text);
  const iconScale = useRem() / 16;
  const insets = useSafeAreaInsets();
  const systemKeyboardHeight = useSystemKeyboardHeight();
  const layout = useLiftoEditorSheetLayout();
  const [isScrollable, setIsScrollable] = useState(false);
  const scrollSizeRef = useRef({ container: 0, content: 0 });
  const measureScrollable = (container: number, content: number): void => {
    scrollSizeRef.current = { container, content };
    setIsScrollable(content > container + 1);
  };

  return (
    // A day is usually past the cap, so it's the scrolling editor that gives.
    <Animated.View style={layout.container} onLayout={layout.onContainerLayout}>
      <NavScreenScrollContext.Provider value={contextValue}>
        <View style={layout.body}>
          {/* The bar alone is a hard target, so the header drags the sheet too - the crumbs
              and Save keep their own taps. */}
          <SheetDragHandle className="flex-row items-center gap-2 px-4 pb-2 border-b border-border-neutral">
            <View className="flex-1">
              <Text className="text-xs font-bold text-text-secondary">{props.headerLabel}</Text>
              {isFreeform ? (
                <Text className="text-sm text-text-secondary">Editing as text</Text>
              ) : (
                <LiftoEditorCrumbs controller={controller} />
              )}
            </View>
            {!isFreeform && hint != null && hintDismissed ? (
              <Pressable testID="day-liftoeditor-show-hint" className="p-1" onPress={() => setHintDismissed(false)}>
                <IconHelp size={20 * iconScale} color={Tailwind_semantic().icon.neutral} />
              </Pressable>
            ) : null}
            {/* Freeform "Apply" folds the text edits back into structured mode (the sheet stays
                open); structured "Save" commits to the program and closes. */}
            <Button
              name="day-liftoeditor-save"
              testID="day-liftoeditor-save"
              kind="purple"
              buttonSize="sm"
              className="text-xs"
              onPress={isFreeform ? () => controller.switchToStructured() : () => props.onDone(controller.text)}
            >
              {isFreeform ? "Apply" : "Save"}
            </Button>
          </SheetDragHandle>
          {!isFreeform && (controller.context?.levels ?? []).length > 0 ? (
            <LiftoEditorPillRail controller={controller} className="border-b border-border-neutral" />
          ) : null}
          {error != null ? (
            <View className="px-3 py-2 border-b bg-background-lighterror border-border-neutral">
              <Text className="text-xs font-semibold text-text-error">{error.message}</Text>
            </View>
          ) : null}
          {!isFreeform && hint != null && !hintDismissed ? (
            <LiftoEditorHintBar hint={hint} onDismiss={() => setHintDismissed(true)} />
          ) : null}
          {/* The viewport the drag measures against and the caret is revealed into is this
              scroll area itself. */}
          <View ref={viewportRef} style={layout.editor}>
            <Animated.ScrollView
              ref={scrollRef}
              testID="day-liftoeditor-scroll"
              // Both this and the viewport wrapper shrink: the sheet's cap is on an ancestor,
              // and a ScrollView that can't shrink would push past it and clip its own end.
              // It grows to fill the wrapper, which carries the editor's min height.
              style={{ flexShrink: 1, flexGrow: 1 }}
              scrollEnabled={isScrollable}
              onScroll={onScroll}
              scrollEventThrottle={16}
              onLayout={(e) => {
                onLayout(e);
                measureScrollable(e.nativeEvent.layout.height, scrollSizeRef.current.content);
              }}
              onContentSizeChange={(width, height) => {
                onContentSizeChange(width, height);
                measureScrollable(scrollSizeRef.current.container, height);
              }}
            >
              {/* The padding is outside the detector on purpose. The rects the drag measures
                  against come back in the editor's own coordinates, while the gesture's y and
                  the absolutely-positioned ghost are relative to the box the detector wraps —
                  any padding between the two shifts the drop line off the exercise it names. */}
              <View className="px-gutter py-3">
                <GestureDetector gesture={gesture}>
                  <View ref={editorBoxRef}>
                    <LiftoEditor
                      {...controller.editorProps}
                      fontSize={layout.editorFontSize}
                      // The eval error quotes a line, and this editor's document is exactly what
                      // that line was counted against.
                      showLineNumbers={true}
                      // Room for Android's cursor drop handle under the last line (~24dp, not
                      // rem-scaled — the handle is a fixed-size system graphic).
                      bottomPadding={isFreeform ? 24 : 0}
                      extraStyledRanges={[
                        ...(controller.editorProps.extraStyledRanges ?? []),
                        ...errorStyledRanges,
                        ...reorder.styledRanges,
                      ]}
                      onCaretRect={revealCaret}
                      onRangeRects={reorder.onRangeRects}
                    />
                    {reorder.overlay}
                  </View>
                </GestureDetector>
              </View>
            </Animated.ScrollView>
          </View>
          {/* iOS reports the raw IME height, which overlaps the home-indicator area the sheet
              already pads for — subtract it. Android's ReactRootView already subtracts the
              system bars from the reported height, so subtracting insets.bottom again would
              leave a keyboard-topper-sized strip covered. */}
          {systemKeyboardHeight > 0 ? (
            <View
              style={{
                height:
                  Math.max(0, systemKeyboardHeight - (Platform.OS === "ios" ? insets.bottom : 0)) + 16 * iconScale,
              }}
            />
          ) : null}
        </View>
      </NavScreenScrollContext.Provider>
    </Animated.View>
  );
}
