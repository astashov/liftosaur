/* eslint-disable @typescript-eslint/ban-types */

import { h, JSX } from "preact";
import { BuilderLinkInlineInput } from "../../builder/components/builderInlineInput";
import { IPlannerProgram, IPlannerProgramDay, IPlannerSettings, IPlannerState, IPlannerUi } from "../models/types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { lb, LensBuilder } from "lens-shmens";
import { PlannerEditorView } from "./plannerEditorView";
import { LinkButton } from "../../../components/linkButton";
import { CollectionUtils } from "../../../utils/collection";
import { PlannerDayStats } from "./plannerDayStats";
import { PlannerExerciseStats } from "./plannerExerciseStats";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";
import { ExerciseImageUtils } from "../../../models/exerciseImage";
import { Exercise } from "../../../models/exercise";
import { HtmlUtils } from "../../../utils/html";
import { TimeUtils } from "../../../utils/time";
import { PlannerStatsUtils } from "../models/plannerStatsUtils";
import { IconWatch } from "../../../components/icons/iconWatch";
import { Service } from "../../../api/service";
import { IconSpinner } from "../../../components/icons/iconSpinner";
import { useState } from "preact/hooks";
import { IconHelp } from "../../../components/icons/iconHelp";

interface IPlannerDayProps {
  weekIndex: number;
  dayIndex: number;
  day: IPlannerProgramDay;
  program: IPlannerProgram;
  lbProgram: LensBuilder<IPlannerState, IPlannerProgram, {}>;
  ui: IPlannerUi;
  evaluatedWeeks: IPlannerEvalResult[][];
  settings: IPlannerSettings;
  dispatch: ILensDispatch<IPlannerState>;
  service: Service;
}

export function PlannerDay(props: IPlannerDayProps): JSX.Element {
  const { day, dispatch, lbProgram, weekIndex, dayIndex } = props;
  const { customExercises } = props.settings;
  const [reformatterSpinner, setReformatterSpinner] = useState(false);
  const focusedExercise = props.ui.focusedExercise;
  const evaluatedDay = props.evaluatedWeeks[weekIndex][dayIndex];
  const isFocused = focusedExercise?.weekIndex === weekIndex && focusedExercise?.dayIndex === dayIndex;
  const exerciseImageUrls = [];
  let approxDayTime: string | undefined;
  if (evaluatedDay.success) {
    for (const plannerExercise of evaluatedDay.data) {
      const exercise = Exercise.findByName(plannerExercise.name, {});
      const imageUrl =
        exercise && ExerciseImageUtils.exists(exercise, "small")
          ? ExerciseImageUtils.url(exercise, "small")
          : undefined;
      if (imageUrl) {
        exerciseImageUrls[plannerExercise.line - 1] = imageUrl;
      }
    }
    approxDayTime = TimeUtils.formatHHMM(PlannerStatsUtils.dayApproxTimeMs(evaluatedDay.data, props.settings));
  }
  for (let i = 0; i < exerciseImageUrls.length; i++) {
    if (!exerciseImageUrls[i]) {
      exerciseImageUrls[i] = undefined;
    }
  }

  return (
    <div className="flex">
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
          <div className="w-10">
            <ul className="pt-2">
              {exerciseImageUrls.map((imageUrl) => {
                return (
                  <li style={{ width: "34px", height: "31px" }} className="text-center">
                    {imageUrl ? (
                      <img
                        style={{ maxWidth: "34px", maxHeight: "31px" }}
                        data-cy="exercise-image-small"
                        className="inline"
                        src={imageUrl}
                      />
                    ) : (
                      <div />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="flex-1">
            <PlannerEditorView
              name="Exercises"
              customExercises={customExercises}
              result={evaluatedDay}
              value={day.exerciseText}
              onCustomErrorCta={(err) => {
                const match = err.match(/Unknown exercise ([^\(]+)/);
                if (match) {
                  const customExerciseName = match[1].trim();
                  return (
                    <LinkButton
                      onClick={() => {
                        dispatch(
                          lb<IPlannerState>()
                            .p("ui")
                            .p("modalExercise")
                            .record({
                              focusedExercise: {
                                weekIndex,
                                dayIndex,
                                exerciseLine: 0,
                              },
                              types: [],
                              muscleGroups: [],
                              customExerciseName,
                            })
                        );
                      }}
                    >
                      Add custom exercise
                    </LinkButton>
                  );
                }
                return undefined;
              }}
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
            <div className="text-sm text-right" style={{ marginTop: "-0.25rem" }}>
              {reformatterSpinner && <IconSpinner width={12} height={12} />}
              <LinkButton
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
                className="ml-1 align-middle"
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
          <PlannerExerciseStats
            settings={props.settings}
            program={props.program}
            evaluatedWeeks={props.evaluatedWeeks}
            weekIndex={weekIndex}
            dayIndex={dayIndex}
            exerciseLine={focusedExercise?.exerciseLine}
          />
        )}
        <div className="mb-6">
          <LinkButton
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
      <div className="w-56 ml-4">
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
