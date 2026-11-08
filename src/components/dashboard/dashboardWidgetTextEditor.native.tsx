import { JSX } from "react";
import { Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../primitives/text";
import { LiftoEditor } from "../primitives/liftoEditor";
import { useLiftoEditorSheetFontSize } from "../primitives/liftoEditorMetrics";
import { LiftographPillBar } from "../liftographPillBar";
import { LiftoEditorCrumbs, LiftoEditorPillRail } from "../liftoEditorChrome";
import { useLiftographEditorController } from "../liftographEditorController.native";
import { LiftographHighlight_diagnosticRanges } from "../../liftograph/liftographHighlight";
import { LiftographDocument_diagnosticLabel } from "../../liftograph/liftographDocument";
import { useSystemKeyboardHeight } from "../../utils/useSystemKeyboardHeight";
import type { IDashboardWidgetTextEditorProps } from "./dashboardWidgetTextEditorTypes";
import { useFreeformKeyboardExit } from "./useFreeformKeyboardExit";

export function DashboardWidgetTextEditor(props: IDashboardWidgetTextEditorProps): JSX.Element {
  const controller = useLiftographEditorController(props.text, props.analysis, { onTextChange: props.onChange });
  const isFreeform = controller.mode === "freeform";
  useFreeformKeyboardExit(isFreeform, () => {
    controller.switchToStructured();
    controller.blur();
  });
  const fontSize = useLiftoEditorSheetFontSize();
  const systemKeyboardHeight = useSystemKeyboardHeight();
  const insets = useSafeAreaInsets();
  const firstError = props.diagnostics[0];
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        stickyHeaderIndices={[0]}
      >
        {props.header}
        <View testID="dashboard-widget-text-editor" className="px-4 py-3">
          {props.notice != null ? <Text className="pb-2 text-xs text-text-error">{props.notice}</Text> : null}
          {!isFreeform ? (
            <View className="pb-2">
              <LiftoEditorCrumbs controller={controller} />
              <LiftoEditorPillRail controller={controller} />
            </View>
          ) : null}
          {firstError != null ? (
            <Text className="pb-2 text-xs font-semibold text-text-error">
              {LiftographDocument_diagnosticLabel(controller.text, firstError)}
            </Text>
          ) : null}
          <LiftoEditor
            {...controller.editorProps}
            fontSize={fontSize}
            bottomPadding={24}
            extraStyledRanges={[
              ...(controller.editorProps.extraStyledRanges ?? []),
              ...LiftographHighlight_diagnosticRanges(props.diagnostics, controller.text.length),
            ]}
          />
        </View>
      </ScrollView>
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
  );
}
