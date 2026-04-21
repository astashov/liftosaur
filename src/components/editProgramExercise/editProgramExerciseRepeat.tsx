import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { Select } from "../primitives/select";
import { IPlannerProgramExercise, IPlannerExerciseState } from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { EditProgramUiHelpers_changeRepeating } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { lb } from "lens-shmens";
import { LinkButton } from "../linkButton";

interface IEditProgramExerciseRepeatProps {
  plannerExercise: IPlannerProgramExercise;
  numberOfWeeks: number;
  settings: ISettings;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  onRemoveOverride: () => void;
}

export function EditProgramExerciseRepeat(props: IEditProgramExerciseRepeatProps): JSX.Element {
  const plannerExercise = props.plannerExercise;
  const repeatFrom = plannerExercise.repeating[0] ?? plannerExercise.dayData.week;
  const repeatTo = plannerExercise.repeating[plannerExercise.repeating.length - 1] ?? plannerExercise.dayData.week;
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");

  if (plannerExercise.isRepeat) {
    return (
      <View className="flex-row flex-wrap items-center mb-2">
        <Text className="text-sm">
          Repeating weeks {repeatFrom} - {repeatTo}
        </Text>
        <View className="ml-2">
          <LinkButton name="edit-exercise-repeat-remove-override" onClick={props.onRemoveOverride}>
            Remove Override
          </LinkButton>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-row items-center pb-2 border-b border-border-neutral">
      <Text className="mr-2 text-sm">Repeat from week {repeatFrom} to week: </Text>
      <Select
        value={String(repeatTo)}
        className="mx-1 border border-border-neutral bg-background-default"
        options={Array.from({ length: props.numberOfWeeks }, (_, i) => i + 1).map((w) => ({
          value: String(w),
          label: String(w),
        }))}
        onChange={(value) => {
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            props.plannerDispatch(
              lbProgram.recordModify((program) => {
                return EditProgramUiHelpers_changeRepeating(
                  program,
                  plannerExercise.dayData,
                  numValue,
                  plannerExercise.fullName,
                  props.settings,
                  true
                );
              }),
              "Change repeat week"
            );
          }
        }}
      />
    </View>
  );
}
