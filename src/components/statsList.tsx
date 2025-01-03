import { useState } from "react";
import { View, TextInput, Alert } from "react-native";
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
import { LftText } from "./lftText";

interface IProps {
  stats: IStats;
  settings: ISettings;
  subscription: ISubscription;
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
  const [selectedKey, setSelectedKey] = useState<IStatsKey>(statsKeys[0] || "weight");
  const movingAverageWindowSize = props.settings.graphOptions[selectedKey]?.movingAverageWindowSize;
  const values = getValues(props.stats, selectedKey);

  if (statsKeys.length === 0) {
    return (
      <View>
        <LftText className="py-12 text-xl text-center text-grayv2-main">No measurements added yet</LftText>
        <View className="flex-row justify-center text-center">
          <Button
            name="add-measurements"
            data-cy="add-measurements"
            kind="purple"
            onPress={() => props.dispatch(Thunk.pushScreen("stats"))}
          >
            Add measurements
          </Button>
        </View>
      </View>
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
    <View className="px-4" data-cy={`stats-list-${selectedKey}`}>
      <View className="pb-2 text-center">
        <Button
          name="add-measurements"
          data-cy="add-measurements"
          kind="purple"
          onPress={() => props.dispatch(Thunk.pushScreen("stats"))}
        >
          Add measurements
        </Button>
      </View>
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
      <View className="relative">
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
      </View>
      {values.length === 0 ? (
        <>
          <LftText className="py-12 text-xl text-center text-grayv2-main">
            No {Stats.name(selectedKey)} measurements added yet
          </LftText>
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
                <View className="flex flex-row items-center">
                  <View className="flex-1">
                    <TextInput
                      className="inline-block py-2 text-bluev2"
                      data-cy="input-stats-date"
                      onChange={(e) => {
                        const date = Date.parse(e.nativeEvent.text + "T00:00:00");
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
                  </View>
                  <View className="flex flex-row flex-1">
                    <TextInput
                      data-cy="input-stats-value"
                      className="flex-1 w-full p-2 text-right text-bluev2"
                      value={convertedValue.value.toFixed(2)}
                      onChange={(e) => {
                        const num = parseFloat(e.nativeEvent.text);
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
                    <LftText className="py-3" data-cy="input-stats-unit">
                      {units}
                    </LftText>
                  </View>
                  <View>
                    <Button
                      name="delete-stat"
                      kind="orange"
                      className="p-3 ls-delete-stat"
                      data-cy="delete-stat"
                      onPress={() => {
                        Alert.alert("Confirmation", "Are you sure?", [
                          {
                            text: "Cancel",
                            style: "cancel",
                          },
                          {
                            text: "OK",
                            onPress: () => {
                              if (selectedKey === "weight") {
                                EditStats.deleteWeightStat(props.dispatch, selectedKey, value.index, value.timestamp);
                              } else if (selectedKey === "bodyfat") {
                                EditStats.deletePercentageStat(
                                  props.dispatch,
                                  selectedKey,
                                  value.index,
                                  value.timestamp
                                );
                              } else {
                                EditStats.deleteLengthStat(props.dispatch, selectedKey, value.index, value.timestamp);
                              }
                            },
                          },
                        ]);
                      }}
                    >
                      <IconTrash />
                    </Button>
                  </View>
                </View>
              </MenuItemWrapper>
            );
          })}
        </>
      )}
    </View>
  );
}
