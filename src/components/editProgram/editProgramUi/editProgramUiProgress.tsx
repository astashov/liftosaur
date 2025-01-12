import { View } from "react-native";
import { IPlannerProgramProperty } from "../../../pages/planner/models/types";
import { LftText } from "../../lftText";

interface IEditProgramUiProgressProps {
  progress: IPlannerProgramProperty;
}

export function EditProgramUiProgress(props: IEditProgramUiProgressProps): JSX.Element {
  const progress = props.progress;
  return (
    <View className="text-xs text-grayv2-main" data-cy="edit-program-progress">
      <LftText className="text-xs font-bold">Progress: </LftText>
      {progress.fnName === "none" ? (
        <LftText className="text-xs">none</LftText>
      ) : (
        <LftText className="text-xs">
          {progress.fnName}({progress.fnArgs.join(", ")}){progress.body && ` { ...${progress.body} }`}
          {progress.script && ` { ... }`}
        </LftText>
      )}
    </View>
  );
}
