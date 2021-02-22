import { h, JSX } from "preact";
import { useState } from "preact/hooks";
import { IDispatch } from "../ducks/types";
import { EditStats } from "../models/editStats";
import { Length } from "../models/length";
import { Stats } from "../models/stats";
import { Weight } from "../models/weight";
import { ILength, ISettings, IStats, IStatsKey, IWeight } from "../types";
import { DateUtils } from "../utils/date";
import { ObjectUtils } from "../utils/object";
import { IconDelete } from "./iconDelete";
import { MenuItemWrapper } from "./menuItem";

interface IProps {
  stats: IStats;
  settings: ISettings;
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
    return <div className="py-12 text-xl text-center text-gray-600">No stats added yet</div>;
  }
  const units = selectedKey === "weight" ? props.settings.units : props.settings.lengthUnits;

  return (
    <div className="p-2" data-cy={`stats-list-${selectedKey}`}>
      <div className="px-3 pb-2">
        <select
          data-cy="stats-selector"
          className="w-full p-3"
          onChange={(e) => {
            setSelectedKey(e.currentTarget.value as IStatsKey);
          }}
        >
          {statsKeys.map((key) => (
            <option key={key} value={key} selected={key === selectedKey}>
              {Stats.name(key)}
            </option>
          ))}
        </select>
      </div>
      {values.map((value) => {
        const convertedValue = Weight.is(value.value)
          ? Weight.convertTo(value.value, props.settings.units)
          : Length.convertTo(value.value, props.settings.lengthUnits);
        return (
          <MenuItemWrapper key={`${selectedKey}-${value.timestamp}`} name={`${selectedKey}-${value.timestamp}`}>
            <div className="flex items-center">
              <div className="flex-1">
                <input
                  className="w-40 py-2"
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
                  type="number"
                  data-cy="input-stats-value"
                  className="flex-1 w-full p-2 text-right"
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
                  className="ls-delete-stat p-3"
                  data-cy="delete-stat"
                  onClick={() => {
                    if (selectedKey === "weight") {
                      EditStats.deleteWeightStat(props.dispatch, selectedKey, value.index);
                    } else {
                      EditStats.deleteLengthStat(props.dispatch, selectedKey, value.index);
                    }
                  }}
                >
                  <IconDelete />
                </button>
              </div>
            </div>
          </MenuItemWrapper>
        );
      })}
    </div>
  );
}
