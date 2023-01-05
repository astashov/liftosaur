import { h, JSX, Fragment } from "preact";
import { useState } from "preact/hooks";
import { IDispatch } from "../ducks/types";
import { EditStats } from "../models/editStats";
import { Length } from "../models/length";
import { Stats } from "../models/stats";
import { Weight } from "../models/weight";
import { ILength, ISettings, IStats, IStatsKey, ISubscription, IWeight } from "../types";
import { DateUtils } from "../utils/date";
import { ObjectUtils } from "../utils/object";
import { MenuItemWrapper } from "./menuItem";
import { GroupHeader } from "./groupHeader";
import { MenuItemEditable } from "./menuItemEditable";
import { GraphStats, getWeightDataForGraph, getLengthDataForGraph } from "./graphStats";
import { IconTrash } from "./icons/iconTrash";
import { Locker } from "./locker";

interface IProps {
  stats: IStats;
  settings: ISettings;
  subscription: ISubscription;
  dispatch: IDispatch;
}

interface IValue {
  timestamp: number;
  value: IWeight | ILength;
  index: number;
}

function getValues(stats: IStats, key: IStatsKey): IValue[] {
  if (key === "weight") {
    const subset = stats.weight[key] || [];
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
  const statsKeys: IStatsKey[] = [...ObjectUtils.keys(props.stats.weight), ...ObjectUtils.keys(props.stats.length)];
  const [selectedKey, setSelectedKey] = useState<IStatsKey>(statsKeys[0] || "weight");
  const values = getValues(props.stats, selectedKey);

  if (statsKeys.length === 0) {
    return <div className="py-12 text-xl text-center text-grayv2-main">No measurements added yet</div>;
  }
  const units = selectedKey === "weight" ? props.settings.units : props.settings.lengthUnits;
  const graphPoints =
    selectedKey === "weight"
      ? getWeightDataForGraph(props.stats.weight[selectedKey] || [], props.settings)
      : getLengthDataForGraph(props.stats.length[selectedKey] || [], props.settings);

  return (
    <div className="px-4" data-cy={`stats-list-${selectedKey}`}>
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
      <div className="relative">
        <Locker topic="Graphs" dispatch={props.dispatch} blur={8} subscription={props.subscription} />
        {graphPoints.length > 2 && (
          <GraphStats
            title={null}
            isSameXAxis={false}
            minX={graphPoints[0][0]}
            maxX={graphPoints[graphPoints.length - 1][0]}
            units={props.settings.units}
            key={selectedKey}
            settings={props.settings}
            collection={graphPoints}
            statsKey={selectedKey}
          />
        )}
      </div>
      {values.length === 0 ? (
        <div className="py-12 text-xl text-center text-grayv2-main">
          No {Stats.name(selectedKey)} measurements added yet
        </div>
      ) : (
        <>
          <GroupHeader name="List of measurements" topPadding={false} />
          {values.map((value) => {
            const convertedValue = Weight.is(value.value)
              ? Weight.convertTo(value.value, props.settings.units)
              : Length.convertTo(value.value, props.settings.lengthUnits);
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
                      type="tel"
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
                            EditStats.deleteWeightStat(props.dispatch, selectedKey, value.index);
                          } else {
                            EditStats.deleteLengthStat(props.dispatch, selectedKey, value.index);
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
