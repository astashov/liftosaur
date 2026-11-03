import { JSX, useEffect } from "react";
import { Animated, Platform, Pressable, View } from "react-native";
import { Directions, Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../../components/button";
import { Text } from "../../components/primitives/text";
import { LiftoEditor } from "../../components/primitives/liftoEditor";
import { LiftographPillBar } from "../../components/liftographPillBar";
import {
  LiftoEditorCrumbs,
  LiftoEditorHintBar,
  LiftoEditorPillRail,
  useLiftoEditorHintDismissed,
} from "../../components/liftoEditorChrome";
import { useLiftographEditorController } from "../../components/liftographEditorController.native";
import { IconHelp } from "../../components/icons/iconHelp";
import { LiftographHighlight_diagnosticRanges } from "../../liftograph/liftographHighlight";
import { LiftographDocument_diagnosticLabel } from "../../liftograph/liftographDocument";
import { LiftographHints_helpId } from "../../liftograph/liftographHints";
import { useSystemKeyboardHeight } from "../../utils/useSystemKeyboardHeight";
import { useRem } from "../../utils/useRem";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { SheetDragHandle } from "../TransparentModal";
import { NavScreenScrollContext } from "../NavScreenScrollContext";
import { useNavScreenScroll } from "../useNavScreenScroll";
import { useLiftoEditorSheetLayout } from "./liftoEditorSheetLayout";
import { useLiftoEditorCaretReveal } from "./liftoEditorCaretReveal";
import type { IDashboardEditorSheetProps } from "./dashboardEditorSheetTypes";

export function DashboardEditorSheet(props: IDashboardEditorSheetProps): JSX.Element {
  const controller = useLiftographEditorController(props.initialText, props.analysis, {
    onTextChange: props.onTextChange,
  });
  const isFreeform = controller.mode === "freeform";
  const insets = useSafeAreaInsets();
  const systemKeyboardHeight = useSystemKeyboardHeight();
  const layout = useLiftoEditorSheetLayout();
  const iconScale = useRem() / 16;
  const [hintDismissed, setHintDismissed] = useLiftoEditorHintDismissed(LiftographHints_helpId);
  const { contextValue, scrollRef, viewportRef, onScroll, onLayout, onContentSizeChange } = useNavScreenScroll({
    footerHeight: 0,
    stickyHeaderHeight: 0,
  });
  const { editorBoxRef, revealCaret } = useLiftoEditorCaretReveal({
    scrollRef,
    viewportRef,
    scrollYRef: contextValue.scrollYRef,
  });
  const caret = controller.caret;
  const handleRef = controller.editorProps.handleRef;

  useEffect(() => {
    if (caret != null) {
      handleRef?.current?.requestCaretRect(caret, caret);
    }
  }, [caret, systemKeyboardHeight]);

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
  const firstError = props.diagnostics[0];
  const hint = controller.hint;
  const textLength = controller.text.length;

  return (
    <Animated.View style={layout.container} onLayout={layout.onContainerLayout}>
      <NavScreenScrollContext.Provider value={contextValue}>
        <View style={layout.body}>
          <SheetDragHandle className="flex-row items-center gap-2 px-4 pb-2 border-b border-border-neutral">
            {isFreeform ? null : (
              <Button name="dashboard-editor-cancel" kind="lightgrayv3" buttonSize="sm" onPress={props.onCancel}>
                Cancel
              </Button>
            )}
            <View className="flex-1">
              <Text className="text-base font-semibold text-center" numberOfLines={1}>
                {props.title}
              </Text>
              {isFreeform ? (
                <Text className="text-sm text-center text-text-secondary">Editing as text</Text>
              ) : (
                <LiftoEditorCrumbs controller={controller} centered={true} />
              )}
            </View>
            {!isFreeform && hint != null && hintDismissed ? (
              <Pressable testID="dashboard-editor-show-hint" className="p-1" onPress={() => setHintDismissed(false)}>
                <IconHelp size={20 * iconScale} color={Tailwind_semantic().icon.neutral} />
              </Pressable>
            ) : null}
            <Button
              name="dashboard-editor-save"
              testID="dashboard-editor-save"
              kind="purple"
              buttonSize="sm"
              onPress={isFreeform ? controller.switchToStructured : () => props.onSave(controller.getText())}
            >
              {isFreeform ? "Apply" : "Save"}
            </Button>
          </SheetDragHandle>
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
          <View ref={viewportRef} style={layout.editor}>
            <GestureDetector gesture={walkFling}>
              <Animated.ScrollView
                ref={scrollRef}
                style={{ flexShrink: 1, flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                onScroll={onScroll}
                scrollEventThrottle={16}
                onLayout={onLayout}
                onContentSizeChange={onContentSizeChange}
              >
                <View className="px-gutter py-3">
                  <View ref={editorBoxRef}>
                    <LiftoEditor
                      {...controller.editorProps}
                      fontSize={layout.editorFontSize}
                      showLineNumbers={true}
                      bottomPadding={24}
                      extraStyledRanges={[
                        ...(controller.editorProps.extraStyledRanges ?? []),
                        ...LiftographHighlight_diagnosticRanges(props.diagnostics, textLength),
                      ]}
                      onCaretRect={revealCaret}
                    />
                  </View>
                </View>
              </Animated.ScrollView>
            </GestureDetector>
          </View>
          {isFreeform ? (
            <LiftographPillBar
              completion={controller.completion}
              onPress={controller.applyCompletion}
              onHideKeyboard={controller.hideKeyboard}
            />
          ) : null}
          {systemKeyboardHeight > 0 ? (
            <View style={{ height: Math.max(0, systemKeyboardHeight - (Platform.OS === "ios" ? insets.bottom : 0)) }} />
          ) : null}
        </View>
      </NavScreenScrollContext.Provider>
    </Animated.View>
  );
}
