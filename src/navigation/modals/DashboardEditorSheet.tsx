import { JSX, useRef } from "react";
import { View } from "react-native";
import { Button } from "../../components/button";
import { Text } from "../../components/primitives/text";
import { LiftographCodeEditor } from "../../components/liftographCodeEditor";
import type { IDashboardEditorSheetProps } from "./dashboardEditorSheetTypes";

export function DashboardEditorSheet(props: IDashboardEditorSheetProps): JSX.Element {
  const textRef = useRef(props.initialText);
  return (
    <View testID="dashboard-editor" className="px-gutter pb-4">
      <View className="flex-row items-center gap-2 pb-2 pr-10">
        <Text className="flex-1 text-base font-semibold">{props.title}</Text>
        <Button
          name="dashboard-editor-save"
          testID="dashboard-editor-save"
          kind="purple"
          buttonSize="sm"
          onPress={() => props.onSave(textRef.current)}
        >
          Save
        </Button>
      </View>
      <LiftographCodeEditor
        initialText={props.initialText}
        analysis={props.analysis}
        diagnostics={props.diagnostics}
        onChange={(value) => {
          textRef.current = value;
          props.onTextChange(value);
        }}
      />
    </View>
  );
}
