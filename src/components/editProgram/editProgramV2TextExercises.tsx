import { LensBuilder, lb } from "lens-shmens";
import { h, JSX } from "preact";
import { PlannerCodeBlock } from "../../pages/planner/components/plannerCodeBlock";
import { PlannerEditorView } from "../../pages/planner/components/plannerEditorView";
import { PlannerStatsUtils } from "../../pages/planner/models/plannerStatsUtils";
import { IPlannerUi, IPlannerState, IPlannerProgramExercise } from "../../pages/planner/models/types";
import { IPlannerEvalResult } from "../../pages/planner/plannerExerciseEvaluator";
import { IPlannerProgram, IPlannerProgramDay, ISettings } from "../../types";
import { CollectionUtils } from "../../utils/collection";
import { TimeUtils } from "../../utils/time";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IconWatch } from "../icons/iconWatch";
import { EditProgramCustomErrorCta } from "./editProgramCustomErrorCta";

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
}

export function EditProgramV2TextExercises(props: IEditProgramV2TextExercisesProps): JSX.Element {
  const { exercises: customExercises } = props.settings;
  const { plannerDay, plannerDispatch, dayIndex, evaluatedDay, lbProgram, weekIndex } = props;
  const focusedExercise = props.ui.focusedExercise;
  const repeats: IPlannerProgramExercise[] = evaluatedDay.success ? evaluatedDay.data.filter((e) => e.isRepeat) : [];
  let approxDayTime: string | undefined;
  if (evaluatedDay.success) {
    approxDayTime = TimeUtils.formatHHMM(
      PlannerStatsUtils.dayApproxTimeMs(evaluatedDay.data, props.settings.timers.workout || 0)
    );
  }
  return (
    <div className="flex-1 w-0">
      <PlannerEditorView
        name="Exercises"
        exerciseFullNames={props.exerciseFullNames}
        customExercises={customExercises}
        lineNumbers={true}
        error={evaluatedDay.success ? undefined : evaluatedDay.error}
        value={plannerDay.exerciseText}
        onCustomErrorCta={(err) => (
          <EditProgramCustomErrorCta
            dayData={{ week: weekIndex + 1, dayInWeek: dayIndex + 1 }}
            dispatch={props.plannerDispatch}
            err={err}
          />
        )}
        onChange={(e) => {
          plannerDispatch(
            lbProgram.p("weeks").i(weekIndex).p("days").i(dayIndex).p("exerciseText").record(e),
            "Update exercise text"
          );
        }}
        onBlur={(e, text) => {}}
        onLineChange={(line) => {
          const exerciseIndex =
            dayIndex !== -1 && evaluatedDay.success
              ? CollectionUtils.findIndexReverse(evaluatedDay.data, (d) => d.line <= line)
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
        <ul className="pl-1 ml-8 overflow-x-auto list-disc">
          {repeats.map((e) => (
            <li>
              <PlannerCodeBlock script={e.text} />
            </li>
          ))}
        </ul>
      )}
      {approxDayTime && (
        <div className="text-xs text-right text-text-secondary">
          <IconWatch className="mb-1 align-middle" />
          <span className="pl-1 align-middle">{approxDayTime}</span>
        </div>
      )}
    </div>
  );
}
