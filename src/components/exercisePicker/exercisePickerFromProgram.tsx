import { JSX, memo } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { IEvaluatedProgram } from "../../models/program";
import { ScrollableTabs } from "../scrollableTabs";
import { ExercisePickerAllProgramExercises } from "./exercisePickerAllProgramExercises";
import { IExercisePickerState, IExerciseType, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";

interface IProps {
  mode: IExercisePickerState["mode"];
  exerciseType?: IExerciseType;
  selectedExercises: IExercisePickerState["selectedExercises"];
  label?: string;
  dispatch: ILensDispatch<IExercisePickerState>;
  usedExerciseTypes: IExerciseType[];
  evaluatedProgram: IEvaluatedProgram;
  settings: ISettings;
}

export const ExercisePickerFromProgram = memo(function ExercisePickerFromProgram(props: IProps): JSX.Element {
  const weeks = props.evaluatedProgram.weeks;
  if (weeks.length > 1) {
    return (
      <ScrollableTabs
        topPadding="0.5rem"
        className="gap-2 px-4"
        nonSticky={true}
        shouldNotExpand={true}
        fillHeight={true}
        type="squares"
        tabs={weeks.map((week) => {
          return {
            label: week.name,
            children: () => {
              return (
                <ExercisePickerAllProgramExercises
                  dispatch={props.dispatch}
                  mode={props.mode}
                  exerciseType={props.exerciseType}
                  selectedExercises={props.selectedExercises}
                  label={props.label}
                  usedExerciseTypes={props.usedExerciseTypes}
                  settings={props.settings}
                  week={week}
                />
              );
            },
          };
        })}
      />
    );
  } else if (weeks.length === 1) {
    return (
      <ExercisePickerAllProgramExercises
        dispatch={props.dispatch}
        mode={props.mode}
        exerciseType={props.exerciseType}
        selectedExercises={props.selectedExercises}
        label={props.label}
        usedExerciseTypes={props.usedExerciseTypes}
        settings={props.settings}
        week={props.evaluatedProgram.weeks[0]}
      />
    );
  } else {
    return (
      <View>
        <Text>No weeks available in the program.</Text>
      </View>
    );
  }
});
