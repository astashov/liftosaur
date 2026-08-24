import type { JSX } from "react";
import { View, ScrollView } from "react-native";
import { LensBuilder, lb } from "lens-shmens";
import { Text } from "../primitives/text";
import { PlannerCodeBlock } from "../../pages/planner/components/plannerCodeBlock";
import { PlannerStatsUtils_dayApproxTimeMs } from "../../pages/planner/models/plannerStatsUtils";
import { IPlannerUi, IPlannerState, IPlannerProgramExercise } from "../../pages/planner/models/types";
import { IPlannerEvalResult } from "../../pages/planner/plannerExerciseEvaluator";
import { IDayData, IPlannerProgram, IPlannerProgramDay, ISettings } from "../../types";
import { IEvaluatedProgram, Program_findPlannerExercise } from "../../models/program";
import { Dialog_alert } from "../../utils/dialog";
import { ProgramDayText_replace } from "../../models/programDayText";
import { useModal } from "../../navigation/ModalStateContext";
import { PlannerKey_fromFullName } from "../../pages/planner/plannerKey";
import { CollectionUtils_findIndexReverse } from "../../utils/collection";
import { TimeUtils_formatHHMM } from "../../utils/time";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IconWatch } from "../icons/iconWatch";
import { DayLiftoEditorInline } from "./dayLiftoEditorInline";

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
  const openAcrossProgram = useModal("acrossProgramModal", (planner) => {
    plannerDispatch(lbProgram.record(planner), "Change across program");
  });
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
      <DayLiftoEditorInline
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
        // Fold, then apply. The day's text is committed on a debounce, so the version the sheet
        // groups by has to be spliced in here rather than waited for; the rewritten planner comes
        // back through plannerDispatch, which is also what gives this undo/redo, and the editor
        // absorbs its own rewritten line through the `text` prop.
        onEditAcrossProgram={(field, exerciseFullName, text) => {
          const planner = ProgramDayText_replace(props.evaluatedProgram.planner, props.dayData, text);
          // Resolved against the planner just folded, not against `exercises` — that is the last
          // committed evaluation, so within the commit debounce, or after a rename that hasn't
          // landed, it answers with a key this planner no longer has.
          const exercise =
            exerciseFullName != null
              ? Program_findPlannerExercise(planner, props.settings, exerciseFullName)
              : undefined;
          if (exercise == null) {
            Dialog_alert("Couldn't tell which exercise this is. Fix any errors on this line and try again.");
            return;
          }
          openAcrossProgram({ planner, exerciseKey: exercise.key, exerciseFullName: exercise.fullName, field });
        }}
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
