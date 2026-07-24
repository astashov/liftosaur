import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { Select } from "../primitives/select";
import {
  IReuseCandidate,
  IPlannerProgramExercise,
  IPlannerProgramReuse,
  IPlannerExerciseState,
} from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ObjectUtils_keys } from "../../utils/object";
import { ILensDispatch } from "../../utils/useLensReducer";
import { EditProgramUiHelpers_changeCurrentInstanceExercise } from "../editProgram/editProgramUi/editProgramUiHelpers";

interface IEditProgramExerciseReuseAtWeekDayProps {
  reuseCandidate: IReuseCandidate;
  plannerExercise: IPlannerProgramExercise;
  reuse: IPlannerProgramReuse;
  settings: ISettings;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  onChangeWeek: (exercise: IPlannerProgramExercise, value: string | undefined) => void;
  onChangeDay: (exercise: IPlannerProgramExercise, value: string | undefined) => void;
}

export function EditProgramExerciseReuseAtWeekDay(props: IEditProgramExerciseReuseAtWeekDayProps): JSX.Element {
  const { reuseCandidate, reuse, plannerExercise } = props;
  const reuseCandidateWeeksAndDays = reuseCandidate.weekAndDays;
  const currentWeek = reuseCandidate.weekAndDays[plannerExercise.dayData.week];
  const week = reuse.week;

  const day =
    reuse.exercise?.dayData.dayInWeek ??
    (week != null || (currentWeek != null && currentWeek.size > 1)
      ? Array.from(reuseCandidate.weekAndDays[week ?? plannerExercise.dayData.week])[0]
      : undefined);

  const weekOptions = [...(currentWeek ? [""] : []), ...ObjectUtils_keys(reuseCandidateWeeksAndDays || {})].map(
    (w) => ({
      value: String(w),
      label: w === "" ? "Same" : String(w),
    })
  );

  const dayOptions = Array.from(reuseCandidateWeeksAndDays[week ?? reuse.exercise?.dayData.week ?? 1]).map((d) => ({
    value: String(d),
    label: String(d),
  }));

  return (
    <View className="flex-row flex-wrap items-center">
      <Text className="text-sm">At week</Text>
      <View className="mx-1">
        <Select
          value={week != null ? String(week) : ""}
          options={weekOptions}
          onChange={(valueStr) => {
            EditProgramUiHelpers_changeCurrentInstanceExercise(
              props.plannerDispatch,
              plannerExercise,
              props.settings,
              (ex) => {
                props.onChangeWeek(ex, valueStr === "" ? undefined : valueStr);
              }
            );
          }}
        />
      </View>
      <Text className="ml-2 text-sm">day</Text>
      <View className="mx-1">
        <Select
          value={day != null ? String(day) : ""}
          options={dayOptions}
          onChange={(valueStr) => {
            EditProgramUiHelpers_changeCurrentInstanceExercise(
              props.plannerDispatch,
              plannerExercise,
              props.settings,
              (ex) => {
                props.onChangeDay(ex, valueStr === "" ? undefined : valueStr);
              }
            );
          }}
        />
      </View>
    </View>
  );
}
