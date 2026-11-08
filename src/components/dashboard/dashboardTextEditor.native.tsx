import { JSX, useContext, useEffect, useRef } from "react";
import { Animated, Platform, Pressable, View } from "react-native";
import { useFreeformKeyboardExit } from "../useFreeformKeyboardExit";
import { Directions, Gesture, GestureDetector } from "react-native-gesture-handler";
import { Text } from "../primitives/text";
import { LiftoEditor } from "../primitives/liftoEditor";
import { useLiftoEditorSheetFontSize } from "../primitives/liftoEditorMetrics";
import { LiftographPillBar } from "../liftographPillBar";
import {
  LiftoEditorCrumbs,
  LiftoEditorHintBar,
  LiftoEditorPillRail,
  useLiftoEditorHintDismissed,
} from "../liftoEditorChrome";
import { useLiftoEditorDockLift } from "../liftoEditorDock";
import { ILiftographEditorController, useLiftographEditorController } from "../liftographEditorController.native";
import { IconHelp } from "../icons/iconHelp";
import { LiftographHighlight_diagnosticRanges } from "../../liftograph/liftographHighlight";
import { LiftographDocument_diagnosticLabel } from "../../liftograph/liftographDocument";
import { LiftographHints_helpId } from "../../liftograph/liftographHints";
import { TextDiff_minimalEdit } from "../../utils/textDiff";
import { useSystemKeyboardHeight } from "../../utils/useSystemKeyboardHeight";
import { useRem } from "../../utils/useRem";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { NavScreenContent, NavScreenScrollContext } from "../../navigation/NavScreenContent";
import { useLiftoEditorCaretReveal } from "../../navigation/modals/liftoEditorCaretReveal";
import type { ILiftographDiagnostic } from "../../liftograph/liftographDocument";
import type { IDashboardTextEditorProps } from "./dashboardTextEditorTypes";

const INITIAL_REVEAL_DELAY_MS = 400;

export function DashboardTextEditor(props: IDashboardTextEditorProps): JSX.Element {
  const emittedRef = useRef(props.text);
  const controller = useLiftographEditorController(props.text, props.analysis, {
    onTextChange: (text) => {
      emittedRef.current = text;
      props.onChange(text);
    },
    initialCaret: props.initialCaret,
  });
  const isFreeform = controller.mode === "freeform";
  const iconScale = useRem() / 16;
  const [hintDismissed, setHintDismissed] = useLiftoEditorHintDismissed(LiftographHints_helpId);
  const lift = useLiftoEditorDockLift();
  const hint = controller.hint;
  const firstError = props.diagnostics[0];
  const handleRef = controller.editorProps.handleRef;
  const blurRef = useRef(controller.blur);
  blurRef.current = controller.blur;
  useFreeformKeyboardExit(isFreeform, () => {
    controller.switchToStructured();
    controller.blur();
  });

  const outsideText = props.text;
  useEffect(() => {
    if (outsideText === emittedRef.current) {
      return;
    }
    const edit = TextDiff_minimalEdit(controller.getText(), outsideText);
    emittedRef.current = outsideText;
    if (edit == null) {
      return;
    }
    blurRef.current();
    handleRef?.current?.replaceRange(edit.start, edit.end, edit.text);
  }, [outsideText, handleRef]);

  return (
    <NavScreenContent
      stickyHeaderIndices={[0]}
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      avoidSystemKeyboard={true}
      footer={
        isFreeform ? (
          <Animated.View style={{ transform: [{ translateY: lift }] }}>
            <LiftographPillBar
              completion={controller.completion}
              onPress={controller.applyCompletion}
              onHideKeyboard={controller.hideKeyboard}
            />
          </Animated.View>
        ) : undefined
      }
    >
      <View className="bg-background-default">
        {props.header}
        {!isFreeform ? (
          <View className="flex-row items-center gap-2 px-4 py-2 border-b border-border-neutral">
            <View className="flex-1">
              <LiftoEditorCrumbs controller={controller} />
            </View>
            {hint != null && hintDismissed ? (
              <Pressable testID="dashboard-editor-show-hint" className="p-1" onPress={() => setHintDismissed(false)}>
                <IconHelp size={20 * iconScale} color={Tailwind_semantic().icon.neutral} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {!isFreeform ? (
          <LiftoEditorPillRail controller={controller} className="border-b border-border-neutral" />
        ) : null}
        {firstError != null ? (
          <View className="px-3 py-2 border-b bg-background-lighterror border-border-neutral">
            <Text className="text-xs font-semibold text-text-error">
              {LiftographDocument_diagnosticLabel(controller.text, firstError)}
            </Text>
          </View>
        ) : null}
        {!isFreeform && hint != null && !hintDismissed ? (
          <LiftoEditorHintBar hint={hint} onDismiss={() => setHintDismissed(true)} />
        ) : null}
      </View>
      <DashboardTextEditorBody
        controller={controller}
        diagnostics={props.diagnostics}
        initialCaret={props.initialCaret}
      />
    </NavScreenContent>
  );
}

function DashboardTextEditorBody(props: {
  controller: ILiftographEditorController;
  diagnostics: ILiftographDiagnostic[];
  initialCaret?: number;
}): JSX.Element | null {
  const { controller } = props;
  const scroll = useContext(NavScreenScrollContext);
  const systemKeyboardHeight = useSystemKeyboardHeight();
  const fontSize = useLiftoEditorSheetFontSize();
  const { editorBoxRef, revealCaret } = useLiftoEditorCaretReveal({
    scrollRef: scroll?.scrollRef ?? { current: null },
    viewportRef: scroll?.viewportRef ?? { current: null },
    scrollYRef: scroll?.scrollYRef ?? { current: 0 },
  });
  const caret = controller.caret;
  const handleRef = controller.editorProps.handleRef;
  const isFreeform = controller.mode === "freeform";

  useEffect(() => {
    if (caret != null) {
      handleRef?.current?.requestCaretRect(caret, caret);
    }
  }, [caret, systemKeyboardHeight]);

  useEffect(() => {
    const initialCaret = props.initialCaret;
    if (initialCaret == null) {
      return undefined;
    }
    const timer = setTimeout(
      () => handleRef?.current?.requestCaretRect(initialCaret, initialCaret),
      INITIAL_REVEAL_DELAY_MS
    );
    return () => clearTimeout(timer);
  }, []);

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
    <GestureDetector gesture={walkFling}>
      <View testID="dashboard-text-editor" className="px-gutter py-3">
        <View ref={editorBoxRef}>
          <LiftoEditor
            {...controller.editorProps}
            fontSize={fontSize}
            showLineNumbers={true}
            bottomPadding={24}
            extraStyledRanges={[
              ...(controller.editorProps.extraStyledRanges ?? []),
              ...LiftographHighlight_diagnosticRanges(props.diagnostics, controller.text.length),
            ]}
            onCaretRect={revealCaret}
          />
        </View>
      </View>
    </GestureDetector>
  );
}
