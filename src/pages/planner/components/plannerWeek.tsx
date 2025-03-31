/* eslint-disable @typescript-eslint/ban-types */

import { h, JSX } from "preact";
import { BuilderLinkInlineInput } from "../../builder/components/builderInlineInput";
import { LinkButton } from "../../../components/linkButton";
import { CollectionUtils } from "../../../utils/collection";
import { ObjectUtils } from "../../../utils/object";
import { PlannerDay } from "./plannerDay";
import { PlannerWeekStats } from "./plannerWeekStats";
import { IPlannerProgramWeek, IPlannerProgram, ISettings, IPlannerProgramDay } from "../../../types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IPlannerUi, IPlannerState } from "../models/types";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";
import { lb } from "lens-shmens";
import { Service } from "../../../api/service";
import { GroupHeader } from "../../../components/groupHeader";
import { MarkdownEditor } from "../../../components/markdownEditor";

interface IPlannerWeekProps {
  initialWeek: IPlannerProgramWeek;
  initialDay: IPlannerProgramDay;
  week: IPlannerProgramWeek;
  weekIndex: number;
  program: IPlannerProgram;
  settings: ISettings;
  ui: IPlannerUi;
  exerciseFullNames: string[];
  evaluatedWeeks: IPlannerEvalResult[][];
  service: Service;
  dispatch: ILensDispatch<IPlannerState>;
}

export function PlannerWeek(props: IPlannerWeekProps): JSX.Element {
  const lbProgram = lb<IPlannerState>().p("current").p("program").pi("planner");
  const showProgramDescription = props.week.description != null;
  return (
    <div key={props.weekIndex} className="flex flex-col md:flex-row">
      <div className="flex-1">
        <h3 className="mr-2 text-xl font-bold">
          <BuilderLinkInlineInput
            value={props.week.name}
            onInputString={(v) => {
              props.dispatch(lbProgram.p("weeks").i(props.weekIndex).p("name").record(v));
            }}
          />
        </h3>
        <div className="mt-1 mb-4 text-sm">
          {props.program.weeks.length > 1 && (
            <span className="mr-2">
              <LinkButton
                name="planner-delete-week"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this week?")) {
                    props.dispatch(
                      lbProgram.p("weeks").recordModify((weeks) => CollectionUtils.removeAt(weeks, props.weekIndex))
                    );
                  }
                }}
              >
                Delete Week
              </LinkButton>
            </span>
          )}
          <span className="mr-2">
            <LinkButton
              name="planner-add-week"
              onClick={() => {
                props.dispatch(
                  lbProgram.p("weeks").recordModify((weeks) => [
                    ...weeks,
                    {
                      ...ObjectUtils.clone(props.initialWeek),
                      name: `Week ${weeks.length + 1}`,
                    },
                  ])
                );
              }}
            >
              Add New Week
            </LinkButton>
          </span>
          <span className="mr-2">
            <LinkButton
              name="planner-duplicate-week"
              onClick={() => {
                props.dispatch(
                  lbProgram.p("weeks").recordModify((weeks) => [
                    ...weeks,
                    {
                      ...ObjectUtils.clone(props.week),
                      name: `Week ${weeks.length + 1}`,
                    },
                  ])
                );
              }}
            >
              Duplicate Week
            </LinkButton>
          </span>
          {!showProgramDescription && (
            <span>
              <LinkButton
                name="planner-add-week-description"
                onClick={() => {
                  props.dispatch(lbProgram.p("weeks").i(props.weekIndex).p("description").record(""));
                }}
              >
                Add Week Description
              </LinkButton>
            </span>
          )}
        </div>

        {showProgramDescription && (
          <div className="mb-4">
            <div className="leading-none">
              <GroupHeader name="Week Description (Markdown)" />
            </div>
            <MarkdownEditor
              value={props.week.description ?? ""}
              onChange={(v) => {
                props.dispatch(lbProgram.p("weeks").i(props.weekIndex).p("description").record(v));
              }}
            />
            <div>
              <LinkButton
                className="text-xs"
                name="planner-delete-week-description"
                onClick={() => {
                  props.dispatch(lbProgram.p("weeks").i(props.weekIndex).p("description").record(undefined));
                }}
              >
                Delete Week Description
              </LinkButton>
            </div>
          </div>
        )}

        {props.week.days.map((day, dayIndex) => {
          return (
            <div key={dayIndex}>
              <PlannerDay
                exerciseFullNames={props.exerciseFullNames}
                evaluatedWeeks={props.evaluatedWeeks}
                settings={props.settings}
                program={props.program}
                dispatch={props.dispatch}
                day={day}
                weekIndex={props.weekIndex}
                dayIndex={dayIndex}
                ui={props.ui}
                lbProgram={lbProgram}
                service={props.service}
              />
            </div>
          );
        })}
        <div className="text-sm">
          <LinkButton
            name="planner-add-day"
            onClick={() => {
              props.dispatch(
                lbProgram
                  .p("weeks")
                  .i(props.weekIndex)
                  .p("days")
                  .recordModify((days) => [
                    ...days,
                    {
                      ...ObjectUtils.clone(props.initialDay),
                      name: `Day ${days.length + 1}`,
                    },
                  ])
              );
            }}
          >
            Add Day
          </LinkButton>
        </div>
      </div>
      <div className="mt-2 ml-0 sm:ml-4 sm:mt-0" style={{ width: "14rem" }}>
        <div className="sticky" style={{ top: "1rem" }}>
          <PlannerWeekStats
            dispatch={props.dispatch}
            evaluatedDays={props.evaluatedWeeks[props.weekIndex]}
            settings={props.settings}
          />
        </div>
      </div>
    </div>
  );
}
