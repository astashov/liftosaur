import { JSX, useState } from "react";
import { View } from "react-native";
import { NavScreenContent } from "../../navigation/NavScreenContent";
import { LiftographCodeEditor } from "../liftographCodeEditor";
import type { IDashboardTextEditorProps } from "./dashboardTextEditorTypes";

export function DashboardTextEditor(props: IDashboardTextEditorProps): JSX.Element {
  const [initialText] = useState(props.text);
  return (
    <NavScreenContent stickyHeaderIndices={[0]}>
      {props.header}
      <View testID="dashboard-text-editor" className="px-4 py-3">
        <LiftographCodeEditor
          isFullHeight
          initialText={initialText}
          initialCaret={props.initialCaret}
          value={props.text}
          analysis={props.analysis}
          diagnostics={props.diagnostics}
          onChange={props.onChange}
        />
      </View>
    </NavScreenContent>
  );
}
