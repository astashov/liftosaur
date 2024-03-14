/* eslint-disable @typescript-eslint/ban-types */

import { h, JSX } from "preact";
import { BuilderLinkInlineInput } from "../../builder/components/builderInlineInput";
import { IPlannerProgramExercise, IPlannerState, IPlannerUi } from "../models/types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { lb, LensBuilder } from "lens-shmens";
import { PlannerEditorView } from "./plannerEditorView";
import { LinkButton } from "../../../components/linkButton";
import { CollectionUtils } from "../../../utils/collection";
import { PlannerDayStats } from "./plannerDayStats";
import { PlannerExerciseStats } from "./plannerExerciseStats";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";
import { Exercise } from "../../../models/exercise";
import { HtmlUtils } from "../../../utils/html";
import { TimeUtils } from "../../../utils/time";
import { PlannerStatsUtils } from "../models/plannerStatsUtils";
import { IconWatch } from "../../../components/icons/iconWatch";
import { Service } from "../../../api/service";
import { IconSpinner } from "../../../components/icons/iconSpinner";
import { useState } from "preact/hooks";
import { IconHelp } from "../../../components/icons/iconHelp";
import { PlannerEditorCustomCta } from "./plannerEditorCustomCta";
import { IPlannerProgram, IPlannerProgramDay, ISettings } from "../../../types";
import { PlannerCodeBlock } from "./plannerCodeBlock";

interface IPlannerDayProps {
  repeats: IPlannerProgramExercise[];
  weekIndex: number;
  dayIndex: number;
  day: IPlannerProgramDay;
  program: IPlannerProgram;
  lbProgram: LensBuilder<IPlannerState, IPlannerProgram, {}>;
  ui: IPlannerUi;
  exerciseFullNames: string[];
  evaluatedWeeks: IPlannerEvalResult[][];
  settings: ISettings;
  dispatch: ILensDispatch<IPlannerState>;
  service: Service;
}

export function PlannerDay(props: IPlannerDayProps): JSX.Element {
  const { day, dispatch, lbProgram, weekIndex, dayIndex } = props;
  const { exercises, equipment } = props.settings;
  const [reformatterSpinner, setReformatterSpinner] = useState(false);
  const focusedExercise = props.ui.focusedExercise;
  const evaluatedDay = props.evaluatedWeeks[weekIndex][dayIndex];
  const isFocused = focusedExercise?.weekIndex === weekIndex && focusedExercise?.dayIndex === dayIndex;
  let approxDayTime: string | undefined;
  if (evaluatedDay.success) {
    for (const plannerExercise of evaluatedDay.data) {
      const exercise = Exercise.findByName(plannerExercise.name, {});
      if (exercise) {
        exercise.equipment = plannerExercise.equipment || exercise.defaultEquipment;
      }
    }
    approxDayTime = TimeUtils.formatHHMM(
      PlannerStatsUtils.dayApproxTimeMs(evaluatedDay.data, props.settings.timers.workout ?? 180)
    );
  }

  return (
    <div className="flex flex-col md:flex-row">
      <div className="flex-1">
        <div className="flex items-center pb-4">
          <h3 className="mr-2 text-xl font-bold">
            <BuilderLinkInlineInput
              value={day.name}
              onInputString={(v) => {
                dispatch(lbProgram.p("weeks").i(weekIndex).p("days").i(dayIndex).p("name").record(v));
              }}
            />
          </h3>
          {approxDayTime && (
            <div className="text-grayv2-main">
              <IconWatch className="mb-1 align-middle" />
              <span className="pl-1 font-bold align-middle">{approxDayTime}</span>
            </div>
          )}
        </div>
        <div className="flex">
          <div className="flex-1 w-0">
            <PlannerEditorView
              lineNumbers={true}
              name="Exercises"
              exerciseFullNames={props.exerciseFullNames}
              customExercises={exercises}
              equipment={equipment}
              error={evaluatedDay.success ? undefined : evaluatedDay.error}
              value={day.exerciseText}
              onCustomErrorCta={(err) => <PlannerEditorCustomCta dispatch={props.dispatch} err={err} />}
              onChange={(e) => {
                dispatch(lbProgram.p("weeks").i(weekIndex).p("days").i(dayIndex).p("exerciseText").record(e));
              }}
              onBlur={(e, text) => {
                const relatedTarget = e.relatedTarget as HTMLElement;
                if (!relatedTarget || !HtmlUtils.someInParents(relatedTarget, (el) => el.tagName === "BUTTON")) {
                  dispatch(lb<IPlannerState>().p("ui").p("focusedExercise").record(undefined));
                }
              }}
              onLineChange={(line) => {
                if (
                  !focusedExercise ||
                  focusedExercise.weekIndex !== weekIndex ||
                  focusedExercise.dayIndex !== dayIndex ||
                  focusedExercise.exerciseLine !== line
                ) {
                  dispatch(
                    lb<IPlannerState>().p("ui").p("focusedExercise").record({ weekIndex, dayIndex, exerciseLine: line })
                  );
                }
              }}
            />
            {props.repeats.length > 0 && (
              <ul className="pl-1 ml-8 overflow-x-auto list-disc">
                {props.repeats.map((e) => (
                  <li>
                    <PlannerCodeBlock script={e.text} />
                  </li>
                ))}
              </ul>
            )}
            <div className="text-sm text-right" style={{ marginTop: "-0.25rem" }}>
              {reformatterSpinner && <IconSpinner width={12} height={12} />}
              <LinkButton
                name="planner-reformat-day"
                className="ml-1 text-xs font-normal align-middle"
                onClick={async () => {
                  setReformatterSpinner(true);
                  const result = await props.service.postPlannerReformatter(day.exerciseText);
                  setReformatterSpinner(false);
                  window.isUndoing = true;
                  dispatch(
                    [lbProgram.p("weeks").i(weekIndex).p("days").i(dayIndex).p("exerciseText").record(result)],
                    "stop-is-undoing"
                  );
                }}
              >
                Reformat
              </LinkButton>
              <button
                className="ml-1 align-middle nm-planner-reformat"
                onClick={() =>
                  alert(
                    "It'll try to format the exercises properly using ChatGPT - so that each exercise goes on a separate line, with proper sets x reps formatting. It's not 100% accurate, it'll do its best attempt! :)"
                  )
                }
              >
                <IconHelp size={12} />
              </button>
            </div>
          </div>
        </div>
        {isFocused && focusedExercise?.exerciseLine != null && (
          <div className="p-4 mt-2 bg-yellow-100 border border-yellow-800 rounded-lg">
            <PlannerExerciseStats
              settings={props.settings}
              evaluatedWeeks={props.evaluatedWeeks}
              dispatch={dispatch}
              weekIndex={weekIndex}
              dayIndex={dayIndex}
              exerciseLine={focusedExercise?.exerciseLine}
            />
          </div>
        )}
        <div className="mb-6">
          <LinkButton
            name="planner-delete-day"
            onClick={() => {
              if (confirm("Are you sure you want to delete this day?")) {
                dispatch(
                  lbProgram
                    .p("weeks")
                    .i(weekIndex)
                    .p("days")
                    .recordModify((days) => CollectionUtils.removeAt(days, dayIndex))
                );
              }
            }}
          >
            Delete Day
          </LinkButton>
        </div>
      </div>
      <div className="w-56 ml-0 sm:ml-4">
        {isFocused && (
          <PlannerDayStats
            dispatch={dispatch}
            focusedExercise={focusedExercise}
            settings={props.settings}
            evaluatedDay={props.evaluatedWeeks[props.weekIndex][props.dayIndex]}
          />
        )}
      </div>
    </div>
  );
}
