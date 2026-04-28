import type { JSX } from "react";
import { Pressable } from "react-native";
import { lb } from "lens-shmens";
import { Text } from "../primitives/text";
import { IPlannerState } from "../../pages/planner/models/types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IShortDayData } from "../../types";
import { Exercise_createCustomExercise } from "../../models/exercise";

interface IPlannerEditorCustomCtaProps {
  err: string;
  dayData: IShortDayData;
  dispatch: ILensDispatch<IPlannerState>;
}

export function EditProgramCustomErrorCta(props: IPlannerEditorCustomCtaProps): JSX.Element {
  const match = props.err.match(/Unknown exercise ([^\(]+)/);
  if (!match) {
    return <></>;
  }
  const customExerciseName = match[1].trim();
  return (
    <Pressable
      className="nm-planner-add-custom-exercise"
      data-testid="planner-add-custom-exercise"
      testID="planner-add-custom-exercise"
      onPress={() => {
        props.dispatch(
          lb<IPlannerState>()
            .p("ui")
            .p("exercisePicker")
            .record({
              state: {
                screenStack: ["customExercise"],
                sort: "name_asc",
                filters: {},
                selectedExercises: [],
                mode: "program",
                customExerciseName,
                editCustomExercise: Exercise_createCustomExercise(customExerciseName, [], [], []),
              },
              change: "all",
              dayData: props.dayData,
            }),
          "Open custom exercise modal"
        );
      }}
    >
      <Text className="underline text-text-alwayswhite">Add custom exercise</Text>
    </Pressable>
  );
}
