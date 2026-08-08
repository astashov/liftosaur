import { JSX, useEffect, useRef, useState } from "react";
import { Keyboard, LayoutChangeEvent, Platform, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { Directions, Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useModal } from "../ModalStateContext";
import { Dialog_alert, Dialog_confirm } from "../../utils/dialog";
import type { IExercisePickerSelectedExercise } from "../../types";
import type { ILiftoEditorReuseSelection } from "../../components/primitives/liftoEditorActions";
import { useCloseCustomKeyboard, useCustomKeyboardHeight } from "../CustomKeyboardContext";
import { LiftoEditor } from "../../components/primitives/liftoEditor";
import type { ILiftoEditorStyledRange } from "../../components/primitives/liftoEditorBrain";
import { useLiftoEditorController } from "../../components/liftoEditorController";
import { LiftoEditorHints_forContext } from "../../components/primitives/liftoEditorHints";
import {
  LiftoEditorCrumbs,
  LiftoEditorHintBar,
  LiftoEditorPillRail,
  useLiftoEditorHintDismissed,
} from "../../components/liftoEditorChrome";
import { Button } from "../../components/button";
import { Text } from "../../components/primitives/text";
import { FadeScrollView } from "../../components/fadeScrollView";
import { IconHelp } from "../../components/icons/iconHelp";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { useRem } from "../../utils/useRem";
import type { IEditorSheetBodyProps, IEditorSheetInstanceOption, IEditorSheetLiveError } from "./editorSheetTypes";

// Must render inside the sheet's own CustomKeyboardProvider: native-stack modal screens sit
// above the app root in the native hierarchy, so the root keyboard host would draw BEHIND
// the sheet (same reason NavModalEditTarget nests a provider).
// Returns how much of the IME the window did NOT absorb. iOS never resizes; Android
// adjustResize shrinks the window on old versions, but targetSdk 35+ edge-to-edge
// enforcement (Android 15+) ignores it — so subtract the actual window shrink instead of
// assuming either behavior.
function useSystemKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  const { height: windowHeight } = useWindowDimensions();
  const noKeyboardWindowHeight = useRef(windowHeight);
  if (height === 0) {
    noKeyboardWindowHeight.current = windowHeight;
  }
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  return Math.max(0, height - Math.max(0, noKeyboardWindowHeight.current - windowHeight));
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
  const reuseSelectRef = useRef<
    { items: ILiftoEditorReuseSelection[]; onSelect: (selection: ILiftoEditorReuseSelection) => void } | undefined
  >(undefined);
  const openReuseSelect = useModal("inputSelectModal", (value) => {
    const pending = reuseSelectRef.current;
    reuseSelectRef.current = undefined;
    const selection = value != null ? pending?.items.find((item) => item.fullName === value) : undefined;
    if (pending != null && selection != null) {
      pending.onSelect(selection);
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
      pickReuse: (kind, onSelect) => {
        const candidates = props.reuseCandidates;
        const items: ILiftoEditorReuseSelection[] =
          kind === "sets"
            ? (candidates?.sets ?? [])
            : ((kind === "progress" ? candidates?.progress : candidates?.update) ?? []).map((fullName) => ({
                fullName,
              }));
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
          name: "editor-sheet-reuse",
          values: items.map((item) => [item.fullName, item.fullName]),
          hint:
            kind === "sets"
              ? "You can only reuse sets of exercises that don't reuse other exercises"
              : "You can only reuse scripts that don't reuse other scripts",
        });
      },
    },
  });
  const [hintDismissed, setHintDismissed] = useLiftoEditorHintDismissed();
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
  const hint = LiftoEditorHints_forContext(controller.context, controller.activeLevelIndex, controller.text);
  const accent = Tailwind_semantic().text.purple;
  const iconScale = useRem() / 16;
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const systemKeyboardHeight = useSystemKeyboardHeight();
  const keypadHeight = useCustomKeyboardHeight();
  const closeKeyboard = useCloseCustomKeyboard();
  const isFreeform = controller.mode === "freeform";
  const onModeChangeRef = useRef(props.onModeChange);
  onModeChangeRef.current = props.onModeChange;
  useEffect(() => {
    onModeChangeRef.current?.(isFreeform ? "freeform" : "structured");
  }, [isFreeform]);
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

  // When the whole text fits, lock the editor's vertical scroll so token-hopping swipes
  // don't also drag the content around.
  const [editorScroll, setEditorScroll] = useState({ container: 0, content: 0 });
  const isEditorScrollable = editorScroll.content > editorScroll.container + 1;

  // Horizontal swipes anywhere over the editor hop between tokens (swipe right = next).
  // Flings don't fire on taps or vertical scrolls, so those pass through untouched; in
  // freeform mode the swipes are off to not fight native text selection.
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
                    key={`${instance.dayData.week}-${instance.dayData.dayInWeek}`}
                    testID={`editor-sheet-instance-${instance.dayData.week}-${instance.dayData.dayInWeek}`}
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
              <LiftoEditorCrumbs controller={controller} />
            )}
          </View>
          {!isFreeform && hint != null && hintDismissed ? (
            <Pressable testID="editor-sheet-show-hint" className="p-1" onPress={() => setHintDismissed(false)}>
              <IconHelp size={20 * iconScale} color={Tailwind_semantic().icon.neutral} />
            </Pressable>
          ) : null}
          {/* Freeform "Apply" folds the text edits back into structured mode (the sheet stays
              open); structured "Save" commits to the program and closes. */}
          <Button
            name="editor-sheet-save"
            kind="purple"
            buttonSize="sm"
            className="text-xs"
            onPress={isFreeform ? controller.switchToStructured : () => props.onDone(controller.text)}
          >
            {isFreeform ? "Apply" : "Save"}
          </Button>
        </View>
        {!isFreeform && (controller.context?.levels ?? []).length > 0 ? (
          <LiftoEditorPillRail controller={controller} className="border-b border-border-neutral" />
        ) : null}
        {liveError != null ? (
          <View className="px-3 py-2 border-b bg-background-lighterror border-border-neutral">
            <Text className="text-xs font-semibold text-text-error">{liveError.message}</Text>
          </View>
        ) : null}
        {!isFreeform && hint != null && !hintDismissed ? (
          <LiftoEditorHintBar hint={hint} onDismiss={() => setHintDismissed(true)} />
        ) : null}
        <GestureDetector gesture={walkFling}>
          <ScrollView
            style={{ flexShrink: 1 }}
            scrollEnabled={isEditorScrollable}
            onLayout={(e) => {
              const height = e.nativeEvent.layout.height;
              setEditorScroll((prev) => (prev.container === height ? prev : { ...prev, container: height }));
            }}
            onContentSizeChange={(_w, height) =>
              setEditorScroll((prev) => (prev.content === height ? prev : { ...prev, content: height }))
            }
          >
            <View className="px-4 py-3">
              <LiftoEditor
                {...controller.editorProps}
                // Room for Android's cursor drop handle under the last line (~24dp, not
                // rem-scaled — the handle is a fixed-size system graphic).
                bottomPadding={isFreeform ? 24 : 0}
                extraStyledRanges={[...(controller.editorProps.extraStyledRanges ?? []), ...errorStyledRanges]}
              />
            </View>
          </ScrollView>
        </GestureDetector>
        {/* iOS reports the raw IME height, which overlaps the home-indicator area the sheet
            already pads for — subtract it. Android's ReactRootView already subtracts the
            system bars from the reported height (imeInsets - systemBars), so subtracting
            insets.bottom again would leave a keyboard-topper-sized strip covered. The extra
            1rem keeps the last text line from sitting flush against the IME. */}
        {systemKeyboardHeight > 0 ? (
          <View
            style={{
              height: Math.max(0, systemKeyboardHeight - (Platform.OS === "ios" ? insets.bottom : 0)) + 16 * iconScale,
            }}
          />
        ) : null}
      </View>
    </View>
  );
}
