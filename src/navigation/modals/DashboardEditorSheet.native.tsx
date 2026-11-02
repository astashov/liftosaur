import { JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../../components/button";
import { Text } from "../../components/primitives/text";
import { LiftoEditor } from "../../components/primitives/liftoEditor";
import type { ILiftoEditorHandle } from "../../components/primitives/liftoEditorBrain";
import { LiftographPillBar } from "../../components/liftographPillBar";
import { LiftographHighlight_diagnosticRanges } from "../../liftograph/liftographHighlight";
import {
  ILiftographCompletionOption,
  ILiftographEditorSnapshot,
  LiftographCompletions_tap,
} from "../../liftograph/liftographCompletions";
import {
  LiftographEditorEdits_canComplete,
  LiftographEditorEdits_init,
  LiftographEditorEdits_saveText,
  LiftographEditorEdits_selected,
  LiftographEditorEdits_typed,
} from "../../liftograph/liftographEditorEdits";
import { useSystemKeyboardHeight } from "../../utils/useSystemKeyboardHeight";
import { SheetDragHandle } from "../TransparentModal";
import { NavScreenScrollContext } from "../NavScreenScrollContext";
import { useNavScreenScroll } from "../useNavScreenScroll";
import { useLiftoEditorSheetLayout } from "./liftoEditorSheetLayout";
import { useLiftoEditorCaretReveal } from "./liftoEditorCaretReveal";
import type { IDashboardEditorSheetProps } from "./dashboardEditorSheetTypes";

export function DashboardEditorSheet(props: IDashboardEditorSheetProps): JSX.Element {
  const { analysis } = props;
  const handleRef = useRef<ILiftoEditorHandle | undefined>(undefined);
  const [editor, setEditor] = useState(() => LiftographEditorEdits_init(props.initialText));
  const editorRef = useRef<ILiftographEditorSnapshot>(editor);
  const updateEditor = (next: ILiftographEditorSnapshot): void => {
    editorRef.current = next;
    setEditor(next);
  };
  const { text, start: caret } = editor;
  const insets = useSafeAreaInsets();
  const systemKeyboardHeight = useSystemKeyboardHeight();
  const layout = useLiftoEditorSheetLayout();
  const { contextValue, scrollRef, viewportRef, onScroll, onLayout, onContentSizeChange } = useNavScreenScroll({
    footerHeight: 0,
    stickyHeaderHeight: 0,
  });
  const { editorBoxRef, revealCaret } = useLiftoEditorCaretReveal({
    scrollRef,
    viewportRef,
    scrollYRef: contextValue.scrollYRef,
  });

  useEffect(() => {
    handleRef.current?.requestCaretRect(caret, caret);
  }, [caret, text, systemKeyboardHeight]);

  const computeStyledRanges = useCallback((value: string) => analysis.styledRanges(value), [analysis]);
  const completion = useMemo(
    () =>
      LiftographEditorEdits_canComplete(editor) ? analysis.completions(editor.text, editor.start, "strip") : undefined,
    [analysis, editor]
  );
  const firstError = props.diagnostics[0];

  const onPill = (option: ILiftographCompletionOption): void => {
    const snapshot = editorRef.current;
    const tap = LiftographCompletions_tap(
      snapshot,
      analysis.completions(snapshot.text, snapshot.start, "strip"),
      option
    );
    if (tap == null) {
      return;
    }
    updateEditor(tap.next);
    handleRef.current?.replaceRange(tap.edit.from, tap.edit.to, tap.edit.insert);
    handleRef.current?.setSelection(tap.edit.caret, tap.edit.caret);
  };

  return (
    <Animated.View style={layout.container} onLayout={layout.onContainerLayout}>
      <NavScreenScrollContext.Provider value={contextValue}>
        <View style={layout.body}>
          <SheetDragHandle className="flex-row items-center gap-2 px-4 pb-2 border-b border-border-neutral">
            <Button name="dashboard-editor-cancel" kind="lightgrayv3" buttonSize="sm" onPress={props.onCancel}>
              Cancel
            </Button>
            <Text className="flex-1 text-base font-semibold text-center" numberOfLines={1}>
              {props.title}
            </Text>
            <Button
              name="dashboard-editor-save"
              testID="dashboard-editor-save"
              kind="purple"
              buttonSize="sm"
              onPress={() =>
                props.onSave(LiftographEditorEdits_saveText(editorRef.current, handleRef.current?.getText()))
              }
            >
              Save
            </Button>
          </SheetDragHandle>
          {firstError != null ? (
            <View className="px-3 py-2 border-b bg-background-lighterror border-border-neutral">
              <Text className="text-xs font-semibold text-text-error">{firstError.message}</Text>
            </View>
          ) : null}
          <View ref={viewportRef} style={layout.editor}>
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
                    initialText={props.initialText}
                    autoHeight={true}
                    editable={true}
                    fontSize={layout.editorFontSize}
                    showLineNumbers={true}
                    bottomPadding={24}
                    handleRef={handleRef}
                    computeStyledRanges={computeStyledRanges}
                    extraStyledRanges={LiftographHighlight_diagnosticRanges(props.diagnostics, text.length)}
                    onCaretRect={revealCaret}
                    onTextChange={(value, newCaret) => {
                      updateEditor(LiftographEditorEdits_typed(value, newCaret));
                      props.onTextChange(value);
                    }}
                    onSelectionChange={(start, end) => {
                      updateEditor(LiftographEditorEdits_selected(editorRef.current, start, end));
                    }}
                  />
                </View>
              </View>
            </Animated.ScrollView>
          </View>
          <LiftographPillBar
            completion={completion}
            onPress={onPill}
            onHideKeyboard={() => handleRef.current?.blurEditor()}
          />
          {systemKeyboardHeight > 0 ? (
            <View style={{ height: Math.max(0, systemKeyboardHeight - (Platform.OS === "ios" ? insets.bottom : 0)) }} />
          ) : null}
        </View>
      </NavScreenScrollContext.Provider>
    </Animated.View>
  );
}
