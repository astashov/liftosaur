import { JSX, h } from "preact";
import { IHistoryRecord, ISettings, ISubscription } from "../types";
import { WeekInsightsUtils } from "../utils/weekInsightsUtils";
import { IconFire } from "./icons/iconFire";
import { Tailwind } from "../utils/tailwindConfig";
import { LinkButton } from "./linkButton";
import { useState } from "preact/hooks";
import { History, IPersonalRecords } from "../models/history";
import { StringUtils } from "../utils/string";
import { ISetResults } from "../pages/planner/models/types";
import { PlannerWeekMuscles } from "../pages/planner/components/plannerWeekMuscles";
import { colorPctValue, PlannerSetSplit } from "../pages/planner/components/plannerStats";
import { ObjectUtils } from "../utils/object";
import { PersonalRecords } from "./personalRecords";
import { Subscriptions } from "../utils/subscriptions";
import { IconCrown } from "./icons/iconCrown";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";
import { DateUtils } from "../utils/date";
import { Modal } from "./modal";

interface IWeekInsightsProps {
  prs: IPersonalRecords;
  thisWeekHistory: IHistoryRecord[];
  lastWeekHistory: IHistoryRecord[];
  selectedFirstDayOfWeek: number;
  settings: ISettings;
  subscription: ISubscription;
  dispatch: IDispatch;
  onOpenPlannerSettings: () => void;
}

export function WeekInsights(props: IWeekInsightsProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const isCurrentWeek =
    DateUtils.firstDayOfWeekTimestamp(new Date(), props.settings.startWeekFromMonday) === props.selectedFirstDayOfWeek;

  const setResults = WeekInsightsUtils.calculateSetResults(
    props.thisWeekHistory,
    props.settings.exercises,
    props.settings.planner.synergistMultiplier,
    props.settings.units
  );
  const lastSetResults = WeekInsightsUtils.calculateSetResults(
    props.lastWeekHistory,
    props.settings.exercises,
    props.settings.planner.synergistMultiplier,
    props.settings.units
  );
  const numberOfPrs = History.getNumberOfPersonalRecords(props.thisWeekHistory, props.prs);
  const historyRecord = props.thisWeekHistory[0];
  if (!historyRecord) {
    return <div />;
  }

  if (!Subscriptions.hasSubscription(props.subscription)) {
    return (
      <section
        className="fixed left-0 z-10 w-full px-3 py-2 border top-16 border-yellowv3-300 bg-yellowv3-50 rounded-b-xl"
        onClick={() => props.dispatch(Thunk.pushScreen("subscription"))}
      >
        <div className="flex items-center h-8 gap-1" style={{ marginBottom: "3px" }}>
          <span>
            <IconCrown className="inline-block" size={16} color={Tailwind.colors().yellowv3[600]} />
          </span>
          <span className="text-sm font-semibold text-yellowv3-600" style={{ marginTop: "3px" }}>
            See Week Insights
          </span>
        </div>
      </section>
    );
  }

  const startTs = props.selectedFirstDayOfWeek;
  const endRange = new Date(startTs);
  endRange.setDate(endRange.getDate() + 6);
  const formattedRange = DateUtils.formatRange(startTs, endRange);

  return (
    <section className="fixed left-0 z-10 w-full py-2 border top-16 border-yellowv3-300 bg-yellowv3-50 rounded-b-xl">
      <div className="px-3">
        <div className="flex gap-4">
          <div className="flex items-center gap-1">
            <span>
              <IconFire className="inline-block" size={16} color={Tailwind.colors().yellowv3[600]} />
            </span>
            <span className="text-sm font-semibold" style={{ marginTop: "3px" }}>
              {formattedRange}
            </span>
          </div>
          <div className="ml-auto text-sm">
            <LinkButton name="toggle-week-insights" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? "Show Less" : "Show More"}
            </LinkButton>
          </div>
        </div>
        <div className="flex justify-between mt-1" style={{ marginLeft: "2px" }}>
          <WeekInsightsProperty
            value={Math.round(setResults.volume.value)}
            unit={setResults.volume.unit}
            increment={!isCurrentWeek ? Math.round(setResults.volume.value - lastSetResults.volume.value) : undefined}
          />
          <WeekInsightsProperty
            value={setResults.total}
            hasPadding={true}
            unit={StringUtils.pluralize("set", setResults.total)}
            increment={!isCurrentWeek ? setResults.total - lastSetResults.total : undefined}
          />
          <WeekInsightsProperty
            icon={<span>🏆 </span>}
            hasPadding={true}
            value={numberOfPrs}
            unit={StringUtils.pluralize("PR", numberOfPrs)}
          />
        </div>
      </div>
      {isExpanded && (
        <Modal shouldShowClose={true} isFullWidth={true} isHidden={!isExpanded} onClose={() => setIsExpanded(false)}>
          <WeekInsightsDetails
            thisWeekHistory={props.thisWeekHistory}
            prs={props.prs}
            setResults={setResults}
            settings={props.settings}
            onOpenPlannerSettings={props.onOpenPlannerSettings}
          />
        </Modal>
      )}
    </section>
  );
}

interface IWeekInsightsPropertyProps {
  icon?: JSX.Element;
  value: string | number;
  hasPadding?: boolean;
  increment?: number;
  unit?: string;
}

function WeekInsightsProperty(props: IWeekInsightsPropertyProps): JSX.Element {
  return (
    <div className="">
      {props.icon}
      <span className="text-base font-semibold">{props.value}</span>
      {props.unit && <span className={`text-xs text-grayv3-main ${props.hasPadding ? "ml-1" : ""}`}>{props.unit}</span>}
      {props.increment && props.increment !== 0 ? (
        <span className={`${props.increment > 0 ? `text-greenv3-main` : `text-redv3-main`} ml-1 text-xs font-semibold`}>
          {props.increment > 0 ? "+" : ""}
          {props.increment}
        </span>
      ) : null}
    </div>
  );
}

interface IWeekInsightsDetailsProps {
  prs: IPersonalRecords;
  thisWeekHistory: IHistoryRecord[];
  setResults: ISetResults;
  settings: ISettings;
  onOpenPlannerSettings: () => void;
}

function WeekInsightsDetails(props: IWeekInsightsDetailsProps): JSX.Element {
  const setResults = props.setResults;
  const hasPersonalRecords = History.getNumberOfPersonalRecords(props.thisWeekHistory, props.prs) > 0;

  return (
    <div className="pt-2 text-sm">
      {hasPersonalRecords && (
        <div className="mb-4">
          <PersonalRecords historyRecords={props.thisWeekHistory} prs={props.prs} settings={props.settings} />
        </div>
      )}
      <div className="mb-2">
        <span className="font-semibold">
          💪 {setResults.total} {StringUtils.pluralize("Set", setResults.total)}
        </span>
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
        <LinkButton name="week-insights-show-planner-settings" onClick={props.onOpenPlannerSettings}>
          Change Set Range Settings
        </LinkButton>
      </div>
    </div>
  );
}
