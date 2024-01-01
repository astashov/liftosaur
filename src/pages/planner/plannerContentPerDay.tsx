import { lb } from "lens-shmens";
import { h, JSX } from "preact";
import { useMemo } from "preact/hooks";
import { Service } from "../../api/service";
import { LinkButton } from "../../components/linkButton";
import { ScrollableTabs } from "../../components/scrollableTabs";
import { CollectionUtils } from "../../utils/collection";
import { ObjectUtils } from "../../utils/object";
import { ILensDispatch } from "../../utils/useLensReducer";
import { BuilderLinkInlineInput } from "../builder/components/builderInlineInput";
import { PlannerDay } from "./components/plannerDay";
import { PlannerWeekStats } from "./components/plannerWeekStats";
import { PlannerProgram } from "./models/plannerProgram";
import {
  IPlannerProgram,
  IPlannerProgramDay,
  IPlannerProgramWeek,
  IPlannerSettings,
  IPlannerState,
  IPlannerUi,
} from "./models/types";

export interface IPlannerContentPerDayProps {
  program: IPlannerProgram;
  settings: IPlannerSettings;
  ui: IPlannerUi;
  service: Service;
  initialWeek: IPlannerProgramWeek;
  initialDay: IPlannerProgramDay;
  dispatch: ILensDispatch<IPlannerState>;
}

export function PlannerContentPerDay(props: IPlannerContentPerDayProps): JSX.Element {
  const { program, settings, ui, initialWeek, initialDay, service, dispatch } = props;
  const evaluatedWeeks = useMemo(() => {
    return PlannerProgram.evaluate(program, settings.customExercises);
  }, [program, settings.customExercises]);
  const lbProgram = lb<IPlannerState>().p("current").p("program");

  return (
    <ScrollableTabs
      tabs={program.weeks.map((week, weekIndex) => {
        return {
          label: week.name,
          isInvalid: evaluatedWeeks[weekIndex].some((day) => !day.success),
          children: (
            <div key={weekIndex} className="flex flex-col md:flex-row">
              <div className="flex-1">
                <h3 className="mr-2 text-xl font-bold">
                  <BuilderLinkInlineInput
                    value={week.name}
                    onInputString={(v) => {
                      dispatch(lbProgram.p("weeks").i(weekIndex).p("name").record(v));
                    }}
                  />
                </h3>
                <div className="mt-1 mb-4">
                  {program.weeks.length > 1 && (
                    <span className="mr-2">
                      <LinkButton
                        name="planner-delete-week"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this week?")) {
                            dispatch(
                              lbProgram.p("weeks").recordModify((weeks) => CollectionUtils.removeAt(weeks, weekIndex))
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
                        dispatch(
                          lbProgram.p("weeks").recordModify((weeks) => [
                            ...weeks,
                            {
                              ...ObjectUtils.clone(initialWeek),
                              name: `Week ${weeks.length + 1}`,
                            },
                          ])
                        );
                      }}
                    >
                      Add New Week
                    </LinkButton>
                  </span>
                  <LinkButton
                    name="planner-duplicate-week"
                    onClick={() => {
                      dispatch(
                        lbProgram.p("weeks").recordModify((weeks) => [
                          ...weeks,
                          {
                            ...ObjectUtils.clone(week),
                            name: `Week ${weeks.length + 1}`,
                          },
                        ])
                      );
                    }}
                  >
                    Duplicate Week
                  </LinkButton>
                </div>
                {week.days.map((day, dayIndex) => {
                  return (
                    <div key={dayIndex}>
                      <PlannerDay
                        evaluatedWeeks={evaluatedWeeks}
                        settings={settings}
                        program={program}
                        dispatch={dispatch}
                        day={day}
                        weekIndex={weekIndex}
                        dayIndex={dayIndex}
                        ui={ui}
                        lbProgram={lbProgram}
                        service={service}
                      />
                    </div>
                  );
                })}
                <div>
                  <LinkButton
                    name="planner-add-day"
                    onClick={() => {
                      dispatch(
                        lbProgram
                          .p("weeks")
                          .i(weekIndex)
                          .p("days")
                          .recordModify((days) => [
                            ...days,
                            {
                              ...ObjectUtils.clone(initialDay),
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
                <div className="sticky" style="3rem">
                  <PlannerWeekStats dispatch={dispatch} evaluatedDays={evaluatedWeeks[weekIndex]} settings={settings} />
                </div>
              </div>
            </div>
          ),
        };
      })}
    />
  );
}
