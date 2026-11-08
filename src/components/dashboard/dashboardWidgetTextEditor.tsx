import { JSX, useState } from "react";
import { ScrollView, View } from "react-native";
import { Text } from "../primitives/text";
import { LiftographCodeEditor } from "../liftographCodeEditor";
import type { IDashboardWidgetTextEditorProps } from "./dashboardWidgetTextEditorTypes";

export function DashboardWidgetTextEditor(props: IDashboardWidgetTextEditorProps): JSX.Element {
  const [initialText] = useState(props.text);
  return (
    <ScrollView keyboardShouldPersistTaps="handled" stickyHeaderIndices={[0]}>
      {props.header}
      <View testID="dashboard-widget-text-editor" className="px-4 py-3">
        {props.notice != null ? <Text className="pb-2 text-xs text-text-error">{props.notice}</Text> : null}
        <LiftographCodeEditor
          initialText={initialText}
          value={props.text}
          analysis={props.analysis}
          diagnostics={props.diagnostics}
          onChange={props.onChange}
        />
      </View>
    </ScrollView>
  );
}
