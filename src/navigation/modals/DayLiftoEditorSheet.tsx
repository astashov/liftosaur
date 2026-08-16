import { JSX, useState } from "react";
import { View } from "react-native";
import { PlannerEditorView } from "../../pages/planner/components/plannerEditorView";
import { Button } from "../../components/button";
import { Text } from "../../components/primitives/text";
import type { IDayLiftoEditorSheetProps } from "./dayLiftoEditorSheetTypes";

// Web body: a plain CodeMirror editor — no pills, hints, breadcrumbs or drag-to-reorder. With
// a physical keyboard the structured touch UI adds nothing, and CodeMirror brings autocomplete
// and inline syntax diagnostics of its own. Reordering is a text edit here.
export function DayLiftoEditorSheet(props: IDayLiftoEditorSheetProps): JSX.Element {
  const [text, setText] = useState(props.initialText);

  return (
    <View testID="day-liftoeditor" className="px-gutter pb-4">
      {/* pr-10 clears the sheet container's absolutely-positioned close button. */}
      <View className="flex-row items-center gap-2 pb-2 pr-10">
        <View className="flex-1">
          <Text className="text-xs font-bold text-text-secondary">{props.headerLabel}</Text>
        </View>
        <Button
          name="day-liftoeditor-save"
          testID="day-liftoeditor-save"
          kind="purple"
          buttonSize="sm"
          className="text-xs"
          onPress={() => props.onDone(text)}
        >
          Save
        </Button>
      </View>
      <PlannerEditorView
        name="day-liftoeditor"
        redError={true}
        customExercises={props.settings.exercises}
        exerciseFullNames={props.exerciseFullNames}
        error={props.error}
        value={props.initialText}
        onChange={(value) => {
          setText(value);
          props.onTextChange(value);
        }}
      />
    </View>
  );
}
