import type { JSX } from "react";
import { View, ScrollView } from "react-native";
import { LensBuilder, lb } from "lens-shmens";
import { Text } from "../primitives/text";
import { PlannerCodeBlock } from "../../pages/planner/components/plannerCodeBlock";
import { PlannerStatsUtils_dayApproxTimeMs } from "../../pages/planner/models/plannerStatsUtils";
import { IPlannerUi, IPlannerState, IPlannerProgramExercise } from "../../pages/planner/models/types";
import { IPlannerEvalResult } from "../../pages/planner/plannerExerciseEvaluator";
import { IDayData, IPlannerProgram, IPlannerProgramDay, ISettings } from "../../types";
import { IEvaluatedProgram } from "../../models/program";
import { PlannerKey_fromFullName } from "../../pages/planner/plannerKey";
import { CollectionUtils_findIndexReverse } from "../../utils/collection";
import { TimeUtils_formatHHMM } from "../../utils/time";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IconWatch } from "../icons/iconWatch";
import { EditProgramLiftoEditor } from "./editProgramLiftoEditor";

interface IEditProgramV2TextExercisesProps {
  exerciseFullNames: string[];
  settings: ISettings;
  evaluatedDay: IPlannerEvalResult;
  plannerDay: IPlannerProgramDay;
  dayIndex: number;
  ui: IPlannerUi;
  plannerDispatch: ILensDispatch<IPlannerState>;
  weekIndex: number;
  lbProgram: LensBuilder<IPlannerState, IPlannerProgram, {}, undefined>;
  evaluatedProgram: IEvaluatedProgram;
  dayData: Required<IDayData>;
}

export function EditProgramV2TextExercises(props: IEditProgramV2TextExercisesProps): JSX.Element {
  const { plannerDay, plannerDispatch, dayIndex, evaluatedDay, lbProgram, weekIndex } = props;
  const focusedExercise = props.ui.focusedExercise;
  const repeats: IPlannerProgramExercise[] = evaluatedDay.success ? evaluatedDay.data.filter((e) => e.isRepeat) : [];
  let approxDayTime: string | undefined;
  if (evaluatedDay.success) {
    approxDayTime = TimeUtils_formatHHMM(
      PlannerStatsUtils_dayApproxTimeMs(
        evaluatedDay.data,
        props.settings.timers.workout || 0,
        props.settings.timers.superset
      )
    );
  }
  const exercises = evaluatedDay.success ? evaluatedDay.data : [];
  return (
    <View className="flex-1 w-0 min-w-0">
      <EditProgramLiftoEditor
        // A day that gets replaced underneath us (clone, reorder, delete) is a different
        // document, not an edit of this one, so it remounts.
        key={plannerDay.id ?? `${weekIndex}-${dayIndex}`}
        focusId={`day-${weekIndex}-${dayIndex}`}
        text={plannerDay.exerciseText}
        settings={props.settings}
        evaluatedProgram={props.evaluatedProgram}
        error={evaluatedDay.success ? undefined : evaluatedDay.error}
        exerciseTypeFor={(fullName) => {
          const key = PlannerKey_fromFullName(fullName, props.settings.exercises);
          return exercises.find((e) => e.key === key)?.exerciseType;
        }}
        contextAt={() => ({ dayData: props.dayData, exercises })}
        onChange={(text) => {
          plannerDispatch(
            lbProgram.p("weeks").i(weekIndex).p("days").i(dayIndex).p("exerciseText").record(text),
            "Update exercise text"
          );
        }}
        onLineChange={(line) => {
          const exerciseIndex =
            dayIndex !== -1 && evaluatedDay.success
              ? CollectionUtils_findIndexReverse(evaluatedDay.data, (d) => d.line <= line)
              : -1;
          const exercise = exerciseIndex !== -1 && evaluatedDay.success ? evaluatedDay.data[exerciseIndex] : undefined;

          if (
            !focusedExercise ||
            focusedExercise.weekIndex !== weekIndex ||
            focusedExercise.dayIndex !== dayIndex ||
            focusedExercise.exerciseLine !== exercise?.line
          ) {
            plannerDispatch(
              lb<IPlannerState>()
                .p("ui")
                .p("focusedExercise")
                .record({ weekIndex, dayIndex, exerciseLine: exercise?.line ?? 0 }),
              "Focus on exercise"
            );
          }
        }}
      />
      {repeats.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-1 ml-8">
          <View>
            {repeats.map((e, i) => (
              <View key={i} className="flex-row">
                <Text className="mr-1">{"•"}</Text>
                <PlannerCodeBlock script={e.text} />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
      {approxDayTime && (
        <View className="flex-row justify-end items-center">
          <IconWatch className="mb-1" />
          <Text className="pl-1 text-xs text-text-secondary">{approxDayTime}</Text>
        </View>
      )}
    </View>
  );
}
