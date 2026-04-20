import { JSX, Fragment } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { Weight_print } from "../../models/weight";
import {
  PlannerProgramExercise_progressionType,
  PlannerProgramExercise_getState,
} from "../../pages/planner/models/plannerProgramExercise";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { IEvaluatedProgram, Program_getReusingProgressExercises } from "../../models/program";

interface IEditProgramUiProgressProps {
  evaluatedProgram: IEvaluatedProgram;
  exercise: IPlannerProgramExercise;
}

export function EditProgramUiProgress(props: IEditProgramUiProgressProps): JSX.Element | null {
  let reusingString: JSX.Element | null = null;
  let reusedByString: JSX.Element | null = null;
  let progressExercise: IPlannerProgramExercise | undefined = undefined;
  const { evaluatedProgram, exercise } = props;
  if (exercise.progress?.reuse) {
    progressExercise = exercise.progress.reuse.exercise ?? exercise.reuse?.exercise;
    reusingString = (
      <Text className="text-xs">
        Reusing progress of '<Text className="font-bold">{exercise.progress.reuse?.fullName}</Text>'
      </Text>
    );
  } else if (exercise.progress) {
    progressExercise = exercise;
    const reusingProgressExercises = Program_getReusingProgressExercises(evaluatedProgram, exercise);
    if (reusingProgressExercises.length > 0) {
      reusedByString = (
        <Text className="text-xs">
          This progress reused by:{" "}
          {reusingProgressExercises.map((e, i) => (
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
      <Progression progressExercise={progressExercise} originalExercise={props.exercise} />
      <View>{reusedByString}</View>
    </View>
  );
}

interface IProgressionProps {
  progressExercise: IPlannerProgramExercise;
  originalExercise: IPlannerProgramExercise;
}

function Progression(props: IProgressionProps): JSX.Element {
  const type = props.progressExercise ? PlannerProgramExercise_progressionType(props.progressExercise) : undefined;
  if (type == null) {
    return <View />;
  }
  switch (type.type) {
    case "linear":
      return (
        <View>
          <Text className="text-xs">
            <Text className="font-bold">Linear Progression:</Text>{" "}
            <Text className="font-bold text-text-success">+{Weight_print(type.increase)}</Text>
            {(type.successesRequired || 0 > 1) && (
              <Text>
                {" "}
                after <Text className="font-bold text-text-success">{type.successesRequired}</Text> successes
              </Text>
            )}
            {type.decrease != null && type.decrease.value > 0 && (
              <Text>
                , <Text className="font-bold text-text-error">{Weight_print(type.decrease)}</Text>
              </Text>
            )}
            {type.decrease != null && type.decrease.value > 0 && (
              <Text>
                {" "}
                after <Text className="font-bold text-text-error">{type.failuresRequired}</Text> failures
              </Text>
            )}
            .
          </Text>
        </View>
      );
    case "double":
      return (
        <View>
          <Text className="text-xs">
            <Text className="font-bold">Double Progression</Text>:{" "}
            <Text className="font-bold text-text-success">+{Weight_print(type.increase)}</Text> within{" "}
            <Text className="font-bold">{type.minReps}</Text>-<Text className="font-bold">{type.maxReps}</Text> rep
            range.
          </Text>
        </View>
      );
    case "sumreps":
      return (
        <View>
          <Text className="text-xs">
            <Text className="font-bold">Sum Reps Progression</Text>:{" "}
            <Text className="font-bold text-text-success">+{Weight_print(type.increase)}</Text> if sum of all reps is at
            least <Text className="font-bold">{type.reps}</Text>.
          </Text>
        </View>
      );
    case "custom": {
      const state = PlannerProgramExercise_getState(props.originalExercise);
      return (
        <View>
          <Text className="text-xs font-bold">Custom Progression</Text>
          {Object.keys(state).length > 0 && (
            <View>
              <Text className="text-xs text-text-secondary">State variables:</Text>
              <View className="ml-4">
                {Object.entries(state).map(([name, value]) => {
                  return (
                    <Text key={name} className="text-xs">
                      <Text>{"\u2022  "}</Text>
                      <Text className="text-text-secondary">{name}</Text>:{" "}
                      <Text className="font-bold">{Weight_print(value)}</Text>
                    </Text>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      );
    }
  }
}
