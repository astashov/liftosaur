import React, { JSX } from "react";
import { IHistoryRecord, ISettings } from "../types";
import { WeekInsightsUtils } from "../utils/weekInsightsUtils";
import { DateUtils } from "../utils/date";
import { GroupHeader } from "./groupHeader";
import { colorPctValue, PlannerSetSplit } from "../pages/planner/components/plannerStats";
import { PlannerWeekMuscles } from "../pages/planner/components/plannerWeekMuscles";
import { ObjectUtils } from "../utils/object";
import { StringUtils } from "../utils/string";
import { LinkButton } from "./linkButton";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";

interface IWeekInsightsProps {
  historyRecords: IHistoryRecord[];
  settings: ISettings;
  onOpenPlannerSettings: () => void;
}

export function WeekInsights(props: IWeekInsightsProps): JSX.Element {
  const setResults = WeekInsightsUtils.calculateSetResults(
    props.historyRecords,
    props.settings.exercises,
    props.settings.planner.synergistMultiplier
  );
  const historyRecord = props.historyRecords[0];
  if (!historyRecord) {
    return <div />;
  }
  const firstDayOfWeek = DateUtils.format(DateUtils.firstDayOfWeekTimestamp(historyRecord.startTime), true, true);
  const lastDayOfWeek = DateUtils.format(DateUtils.lastDayOfWeekTimestamp(historyRecord.startTime), true, true);

  return (
    <section className="p-4 m-4 border border-purplev2-300 bg-purplev2-100 rounded-xl">
      <h3 className="font-bold">
        <span className="text-purplev2-main">Week insights</span>: {firstDayOfWeek} - {lastDayOfWeek}
      </h3>
      <GroupHeader name="Sets" size="large" />
      <div>
        <span className="text-grayv2-main">Total:</span> {setResults.total}
      </div>
      <div>
        <span className="text-grayv2-main">Strength: </span>
        <span className={colorPctValue(setResults.total, setResults.strength, props.settings.planner.strengthSetsPct)}>
          {setResults.strength}
          {setResults.total > 0 ? `, ${Math.round((setResults.strength * 100) / setResults.total)}%` : ""}
        </span>
      </div>
      <div>
        <span className="text-grayv2-main">Hypertrophy: </span>
        <span
          className={colorPctValue(setResults.total, setResults.hypertrophy, props.settings.planner.hypertrophySetsPct)}
        >
          {setResults.hypertrophy}
          {setResults.total > 0 ? `, ${Math.round((setResults.hypertrophy * 100) / setResults.total)}%` : ""}
        </span>
      </div>
      <div className="flex mt-2">
        <div className="flex-1 gap-1">
          <div>
            <span className="text-grayv2-main">Upper:</span>{" "}
            <PlannerSetSplit split={setResults.upper} settings={props.settings} shouldIncludeFrequency={true} />
          </div>
          <div>
            <span className="text-grayv2-main">Lower:</span>{" "}
            <PlannerSetSplit split={setResults.lower} settings={props.settings} shouldIncludeFrequency={true} />
          </div>
          <div>
            <span className="text-grayv2-main">Core:</span>{" "}
            <PlannerSetSplit split={setResults.core} settings={props.settings} shouldIncludeFrequency={true} />
          </div>
        </div>
        <div className="flex-1">
          <div>
            <span className="text-grayv2-main">Push:</span>{" "}
            <PlannerSetSplit split={setResults.push} settings={props.settings} shouldIncludeFrequency={true} />
          </div>
          <div>
            <span className="text-grayv2-main">Pull:</span>{" "}
            <PlannerSetSplit split={setResults.pull} settings={props.settings} shouldIncludeFrequency={true} />
          </div>
          <div>
            <span className="text-grayv2-main">Legs:</span>{" "}
            <PlannerSetSplit split={setResults.legs} settings={props.settings} shouldIncludeFrequency={true} />
          </div>
        </div>
      </div>
      <div className="flex items-center mt-2">
        <div className="flex-1">
          {ObjectUtils.keys(setResults.muscleGroup).map((muscleGroup) => {
            return (
              <div>
                <span className="text-grayv2-main">{StringUtils.capitalize(muscleGroup)}:</span>{" "}
                <PlannerSetSplit
                  split={setResults.muscleGroup[muscleGroup]}
                  settings={props.settings}
                  shouldIncludeFrequency={true}
                  muscle={muscleGroup}
                />
              </div>
            );
          })}
        </div>
        <div className="w-20 mb-2">
          <PlannerWeekMuscles settings={props.settings} data={setResults.muscleGroup} />
        </div>
      </div>
      <div className="mt-2">
        <LinkButton
          name="week-insights-show-planner-settings"
          onClick={() => {
            props.onOpenPlannerSettings();
          }}
        >
          Change Set Range Settings
        </LinkButton>
      </div>
    </section>
  );
}

interface IWeekInsightsTeaserProps {
  dispatch: IDispatch;
}

export function WeekInsightsTeaser(props: IWeekInsightsTeaserProps): JSX.Element {
  return (
    <section className="p-4 m-4 text-center border border-purplev2-300 bg-purplev2-100 rounded-xl">
      <LinkButton name="week-insights-teaser" onClick={() => props.dispatch(Thunk.pushScreen("subscription"))}>
        See last week insights!
      </LinkButton>
    </section>
  );
}
