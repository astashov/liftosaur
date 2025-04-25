import { h, JSX, Fragment } from "preact";
import { useState } from "preact/hooks";
import { IDispatch } from "../ducks/types";
import { EditStats } from "../models/editStats";
import { Length } from "../models/length";
import { Stats } from "../models/stats";
import { Weight } from "../models/weight";
import { ILength, IPercentage, ISettings, IStats, IStatsKey, ISubscription, IWeight } from "../types";
import { DateUtils } from "../utils/date";
import { ObjectUtils } from "../utils/object";
import { MenuItemWrapper } from "./menuItem";
import { GroupHeader } from "./groupHeader";
import { MenuItemEditable } from "./menuItemEditable";
import { GraphStats, getWeightDataForGraph, getLengthDataForGraph, getPercentageDataForGraph } from "./graphStats";
import { IconTrash } from "./icons/iconTrash";
import { Locker } from "./locker";
import { Button } from "./button";
import { Thunk } from "../ducks/thunks";
import { updateSettings } from "../models/state";
import { lb } from "lens-shmens";
import { Subscriptions } from "../utils/subscriptions";
import { ImagePreloader } from "../utils/imagePreloader";

interface IProps {
  stats: IStats;
  settings: ISettings;
  subscription: ISubscription;
  initialKey?: IStatsKey;
  dispatch: IDispatch;
}

interface IValue {
  timestamp: number;
  value: IWeight | ILength | IPercentage;
  index: number;
}

function getValues(stats: IStats, key: IStatsKey): IValue[] {
  if (key === "weight") {
    const subset = stats.weight[key] || [];
    return subset.reduce<IValue[]>((memo, stat, index) => {
      memo.push({ timestamp: stat.timestamp, value: stat.value, index });
      return memo;
    }, []);
  } else if (key === "bodyfat") {
    const subset = stats.percentage[key] || [];
    return subset.reduce<IValue[]>((memo, stat, index) => {
      memo.push({ timestamp: stat.timestamp, value: stat.value, index });
      return memo;
    }, []);
  } else {
    const subset = stats.length[key] || [];
    return subset.reduce<IValue[]>((memo, stat, index) => {
      memo.push({ timestamp: stat.timestamp, value: stat.value, index });
      return memo;
    }, []);
  }
}

export function StatsList(props: IProps): JSX.Element {
  const statsKeys: IStatsKey[] = [
    ...ObjectUtils.keys(props.stats.weight).filter((k) => (props.stats.weight[k] || []).length > 0),
    ...ObjectUtils.keys(props.stats.percentage).filter((k) => (props.stats.percentage[k] || []).length > 0),
    ...ObjectUtils.keys(props.stats.length).filter((k) => (props.stats.length[k] || []).length > 0),
  ];
  const [selectedKey, setSelectedKey] = useState<IStatsKey>(props.initialKey || statsKeys[0] || "weight");
  const movingAverageWindowSize = props.settings.graphOptions[selectedKey]?.movingAverageWindowSize;
  const values = getValues(props.stats, selectedKey);

  if (statsKeys.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-center pt-16">
          <div>
            <img src={ImagePreloader.dynoflex} className="block" style={{ width: 180, height: 232 }} />
          </div>
        </div>
        <div className="pt-4 pb-6 text-sm text-center text-grayv2-main">No measurements added yet</div>
        <div className="text-center">
          <Button
            name="add-measurements"
            data-cy="add-measurements"
            kind="purple"
            onClick={() => props.dispatch(Thunk.pushScreen("stats"))}
          >
            Add measurements
          </Button>
        </div>
      </div>
    );
  }
  const units =
    selectedKey === "weight" ? props.settings.units : selectedKey === "bodyfat" ? "%" : props.settings.lengthUnits;
  const graphPoints =
    selectedKey === "weight"
      ? getWeightDataForGraph(props.stats.weight[selectedKey] || [], props.settings)
      : selectedKey === "bodyfat"
        ? getPercentageDataForGraph(props.stats.percentage[selectedKey] || [], props.settings)
        : getLengthDataForGraph(props.stats.length[selectedKey] || [], props.settings);

  const graphUnit =
    selectedKey === "weight" ? props.settings.units : selectedKey === "bodyfat" ? "%" : props.settings.lengthUnits;

  return (
    <div className="px-4" data-cy={`stats-list-${selectedKey}`}>
      <div className="pb-2 text-center">
        <Button
          name="add-measurements"
          data-cy="add-measurements"
          kind="purple"
          onClick={() => props.dispatch(Thunk.pushScreen("stats"))}
        >
          Add measurements
        </Button>
      </div>
      <GroupHeader name="Selected Measurement Type" />
      <MenuItemEditable
        type="select"
        name="Type"
        value={selectedKey}
        values={statsKeys.map((key) => [key, Stats.name(key)])}
        onChange={(value) => {
          setSelectedKey(value as IStatsKey);
        }}
      />
      {Subscriptions.hasSubscription(props.subscription) && (
        <MenuItemEditable
          name="Moving Average Window Size"
          type="select"
          value={movingAverageWindowSize?.toString() ?? ""}
          values={[
            ["", "Off"],
            ["2", "2"],
            ["3", "3"],
            ["4", "4"],
            ["5", "5"],
          ]}
          onChange={(value) => {
            updateSettings(
              props.dispatch,
              lb<ISettings>()
                .p("graphOptions")
                .p(selectedKey)
                .recordModify((opts) => ({
                  ...opts,
                  movingAverageWindowSize: value ? parseInt(value, 10) : undefined,
                }))
            );
          }}
        />
      )}
      <div className="relative">
        {graphPoints.length > 2 && (
          <>
            <GraphStats
              title={null}
              isSameXAxis={false}
              minX={graphPoints[0][0]}
              maxX={graphPoints[graphPoints.length - 1][0]}
              units={graphUnit}
              key={`${selectedKey}_${movingAverageWindowSize}`}
              settings={props.settings}
              collection={graphPoints}
              statsKey={selectedKey}
              movingAverageWindowSize={movingAverageWindowSize}
            />
            <Locker topic="Graphs" dispatch={props.dispatch} blur={8} subscription={props.subscription} />
          </>
        )}
      </div>
      {values.length === 0 ? (
        <>
          <div className="py-12 text-xl text-center text-grayv2-main">
            No {Stats.name(selectedKey)} measurements added yet
          </div>
        </>
      ) : (
        <>
          <GroupHeader name="List of measurements" topPadding={false} />
          {values.map((value) => {
            const convertedValue = Weight.is(value.value)
              ? Weight.convertTo(value.value, props.settings.units)
              : Length.is(value.value)
                ? Length.convertTo(value.value, props.settings.lengthUnits)
                : value.value;
            return (
              <MenuItemWrapper key={`${selectedKey}-${value.timestamp}`} name={`${selectedKey}-${value.timestamp}`}>
                <div className="flex items-center">
                  <div className="flex-1">
                    <input
                      className="inline-block py-2 text-bluev2"
                      data-cy="input-stats-date"
                      type="date"
                      onChange={(e) => {
                        const date = Date.parse(e.currentTarget.value + "T00:00:00");
                        if (!isNaN(date)) {
                          if (selectedKey === "weight") {
                            EditStats.changeStatWeightTimestamp(props.dispatch, selectedKey, value.index, date);
                          } else if (selectedKey === "bodyfat") {
                            EditStats.changeStatPercentageTimestamp(props.dispatch, selectedKey, value.index, date);
                          } else {
                            EditStats.changeStatLengthTimestamp(props.dispatch, selectedKey, value.index, date);
                          }
                        }
                      }}
                      value={DateUtils.formatYYYYMMDD(value.timestamp)}
                    />
                  </div>
                  <div className="flex flex-1">
                    <input
                      type="number"
                      data-cy="input-stats-value"
                      className="flex-1 w-full p-2 text-right text-bluev2"
                      step="0.01"
                      value={+convertedValue.value.toFixed(2)}
                      onInput={(e) => {
                        const num = parseFloat(e.currentTarget.value);
                        if (!isNaN(num)) {
                          if (selectedKey === "weight") {
                            const v = Weight.build(num, props.settings.units);
                            EditStats.changeStatWeightValue(props.dispatch, selectedKey, value.index, v);
                          } else if (selectedKey === "bodyfat") {
                            const v: IPercentage = { value: num, unit: "%" };
                            EditStats.changeStatPercentageValue(props.dispatch, selectedKey, value.index, v);
                          } else {
                            const v = Length.build(num, props.settings.lengthUnits);
                            EditStats.changeStatLengthValue(props.dispatch, selectedKey, value.index, v);
                          }
                        }
                      }}
                    />
                    <span className="py-3" data-cy="input-stats-unit">
                      {units}
                    </span>
                  </div>
                  <div>
                    <button
                      className="p-3 ls-delete-stat"
                      data-cy="delete-stat"
                      onClick={() => {
                        if (confirm("Are you sure?")) {
                          if (selectedKey === "weight") {
                            EditStats.deleteWeightStat(props.dispatch, selectedKey, value.index, value.timestamp);
                          } else if (selectedKey === "bodyfat") {
                            EditStats.deletePercentageStat(props.dispatch, selectedKey, value.index, value.timestamp);
                          } else {
                            EditStats.deleteLengthStat(props.dispatch, selectedKey, value.index, value.timestamp);
                          }
                        }
                      }}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </div>
              </MenuItemWrapper>
            );
          })}
        </>
      )}
    </div>
  );
}
