/* eslint-disable @typescript-eslint/ban-types */

import { h, JSX, Fragment } from "preact";
import { BuilderLinkInlineInput } from "../../builder/components/builderInlineInput";
import { IPlannerProgramExercise, IPlannerState, IPlannerUi } from "../models/types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { lb, LensBuilder } from "lens-shmens";
import { PlannerEditorView } from "./plannerEditorView";
import { LinkButton } from "../../../components/linkButton";
import { CollectionUtils } from "../../../utils/collection";
import { PlannerDayStats } from "./plannerDayStats";
import { getExerciseForStats, PlannerExerciseStats } from "./plannerExerciseStats";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";
import { Exercise } from "../../../models/exercise";
import { TimeUtils } from "../../../utils/time";
import { PlannerStatsUtils } from "../models/plannerStatsUtils";
import { IconWatch } from "../../../components/icons/iconWatch";
import { Service } from "../../../api/service";
import { PlannerEditorCustomCta } from "./plannerEditorCustomCta";
import { IPlannerProgram, IPlannerProgramDay, ISettings } from "../../../types";
import { PlannerCodeBlock } from "./plannerCodeBlock";
import { MarkdownEditor } from "../../../components/markdownEditor";
import { GroupHeader } from "../../../components/groupHeader";

interface IPlannerDayProps {
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
  const { exercises } = props.settings;
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
  const showProgramDescription = day.description != null;
  const repeats: IPlannerProgramExercise[] = evaluatedDay.success ? evaluatedDay.data.filter((e) => e.isRepeat) : [];

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
        {showProgramDescription ? (
          <>
            <div className="leading-none">
              <GroupHeader name="Day Description (Markdown)" />
            </div>
            <MarkdownEditor
              value={evaluatedDay.success ? (day.description ?? "") : ""}
              onChange={(v) => {
                dispatch(lbProgram.p("weeks").i(weekIndex).p("days").i(dayIndex).p("description").record(v));
              }}
            />
            <div>
              <LinkButton
                className="text-xs"
                name="planner-add-day-description"
                onClick={() => {
                  dispatch(lbProgram.p("weeks").i(weekIndex).p("days").i(dayIndex).p("description").record(undefined));
                }}
              >
                Delete Day Description
              </LinkButton>
            </div>
          </>
        ) : (
          <div>
            <LinkButton
              className="text-xs"
              name="planner-add-day-description"
              onClick={() => {
                dispatch(lbProgram.p("weeks").i(weekIndex).p("days").i(dayIndex).p("description").record(""));
              }}
            >
              Add Day Description
            </LinkButton>
          </div>
        )}
        <div className="flex">
          <div className="flex-1 w-0">
            {showProgramDescription && (
              <div className="mt-1 leading-none">
                <GroupHeader name="Exercises" />
              </div>
            )}
            <PlannerEditorView
              lineNumbers={true}
              name="Exercises"
              exerciseFullNames={props.exerciseFullNames}
              customExercises={exercises}
              error={evaluatedDay.success ? undefined : evaluatedDay.error}
              value={day.exerciseText}
              onCustomErrorCta={(err) => (
                <PlannerEditorCustomCta dispatch={props.dispatch} err={err} isInvertedColors={true} />
              )}
              onChange={(e) => {
                dispatch(lbProgram.p("weeks").i(weekIndex).p("days").i(dayIndex).p("exerciseText").record(e));
              }}
              onBlur={(e, text) => {}}
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
            {repeats.length > 0 && (
              <>
                <GroupHeader name="Repeated exercises from previous weeks:" />
                <ul className="pl-1 ml-8 overflow-x-auto list-disc" style={{ marginTop: "-0.5rem" }}>
                  {repeats.map((e) => (
                    <li>
                      <PlannerCodeBlock script={e.text} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
        {isFocused &&
          focusedExercise?.exerciseLine != null &&
          !!getExerciseForStats(
            weekIndex,
            dayIndex,
            focusedExercise.exerciseLine,
            props.evaluatedWeeks,
            props.settings
          ) && (
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
        <div className="mb-6 text-sm">
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
