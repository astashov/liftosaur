import { JSX, Fragment } from "react";
import { View, Pressable } from "react-native";
import { Text } from "../primitives/text";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { IEvaluatedProgram, Program_getSupersetExercises } from "../../models/program";
import { LinkButton } from "../linkButton";
import { navigationRef } from "../../navigation/navigationRef";

interface IEditProgramExerciseSupersetsProps {
  plannerExercise: IPlannerProgramExercise;
  evaluatedProgram: IEvaluatedProgram;
  exerciseStateKey: string;
  programId: string;
}

export function EditProgramExerciseSupersets(props: IEditProgramExerciseSupersetsProps): JSX.Element {
  const superset = props.plannerExercise.superset;
  const supersetExercises = Program_getSupersetExercises(props.evaluatedProgram, props.plannerExercise);
  return (
    <View>
      <Pressable
        className="flex-row flex-wrap items-center gap-2 mx-4 mb-2 border-b border-border-neutral min-h-12"
        data-cy="edit-exercise-select-superset"
        testID="edit-exercise-select-superset"
        onPress={() => {
          navigationRef.navigate("editProgramExerciseSupersetModal", {
            exerciseStateKey: props.exerciseStateKey,
            programId: props.programId,
            exerciseKey: props.plannerExercise.key,
          });
        }}
      >
        <Text className="text-sm">Superset group:</Text>
        <LinkButton name="superset-group">{superset == null ? "None" : superset.name}</LinkButton>
        {supersetExercises.length > 0 && (
          <View className="flex-row flex-wrap" data-cy="edit-exercise-superset-exercises">
            <Text className="text-xs text-text-secondary">(</Text>
            {supersetExercises.map((e, i) => {
              return (
                <Fragment key={e.fullName}>
                  {i !== 0 ? <Text className="text-xs text-text-secondary">, </Text> : null}
                  <Text className="text-xs font-bold text-text-secondary">{e.fullName}</Text>
                </Fragment>
              );
            })}
            <Text className="text-xs text-text-secondary">)</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
