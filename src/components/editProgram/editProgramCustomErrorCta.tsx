import type { JSX } from "react";
import { Pressable } from "react-native";
import { lb } from "lens-shmens";
import { Text } from "../primitives/text";
import { IPlannerState } from "../../pages/planner/models/types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IShortDayData } from "../../types";
import { Exercise_createCustomExercise } from "../../models/exercise";
import type { IEditorError } from "../../editorTypes";

interface IPlannerEditorCustomCtaProps {
  err: IEditorError;
  dayData: IShortDayData;
  dispatch: ILensDispatch<IPlannerState>;
}

export function EditProgramCustomErrorCta(props: IPlannerEditorCustomCtaProps): JSX.Element {
  const details = props.err.details;
  if (details.type !== "unknownExercise") {
    return <></>;
  }
  const customExerciseName = details.data.name;
  return (
    <Pressable
      className="inline-block nm-planner-add-custom-exercise"
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
      <Text className="inline-block underline text-text-alwayswhite">Add custom exercise</Text>
    </Pressable>
  );
}
