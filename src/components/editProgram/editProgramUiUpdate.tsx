import { JSX, Fragment } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { IEvaluatedProgram, Program_getReusingUpdateExercises } from "../../models/program";
import { CollectionUtils_uniqBy } from "../../utils/collection";

interface IEditProgramUiUpdateProps {
  evaluatedProgram: IEvaluatedProgram;
  exercise: IPlannerProgramExercise;
}

export function EditProgramUiUpdate(props: IEditProgramUiUpdateProps): JSX.Element | null {
  let reusingString: JSX.Element | null = null;
  let reusedByString: JSX.Element | null = null;
  let progressExercise: IPlannerProgramExercise | undefined = undefined;
  const { evaluatedProgram, exercise } = props;
  if (exercise.update?.reuse) {
    progressExercise = exercise.update.reuse.exercise;
    reusingString = (
      <Text className="text-xs">
        Reusing update of '<Text className="font-bold">{exercise.update.reuse?.fullName}</Text>'
      </Text>
    );
  } else if (exercise.update) {
    progressExercise = exercise;
    const reusingUpdateExercises = CollectionUtils_uniqBy(
      Program_getReusingUpdateExercises(evaluatedProgram, exercise),
      "fullName"
    );
    if (reusingUpdateExercises.length > 0) {
      reusedByString = (
        <Text className="text-xs">
          This update reused by:{" "}
          {reusingUpdateExercises.map((e, i) => (
            <Fragment key={i}>
              {i !== 0 ? ", " : ""}
              <Text className="font-bold">{e.fullName}</Text>
            </Fragment>
          ))}
          .
        </Text>
      );
    }
  }

  if (progressExercise == null) {
    return null;
  }
  return (
    <View>
      <View>{reusingString}</View>
      <View>
        <Text className="text-xs font-bold">Custom Update</Text>
      </View>
      <View>{reusedByString}</View>
    </View>
  );
}
