import { JSX, useEffect, useState } from "react";
import { View, Pressable, TextInput, Image } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import {
  EditStats_changeStatWeightTimestamp,
  EditStats_changeStatPercentageTimestamp,
  EditStats_changeStatLengthTimestamp,
  EditStats_changeStatWeightValue,
  EditStats_changeStatPercentageValue,
  EditStats_changeStatLengthValue,
  EditStats_deleteWeightStat,
  EditStats_deletePercentageStat,
  EditStats_deleteLengthStat,
} from "../models/editStats";
import { Length_is, Length_convertTo, Length_build } from "../models/length";
import { Stats_name } from "../models/stats";
import { Weight_is, Weight_convertTo, Weight_build } from "../models/weight";
import { ILength, IPercentage, ISettings, IStats, IStatsKey, ISubscription, IWeight } from "../types";
import { ObjectUtils_keys } from "../utils/object";
import { MenuItemWrapper } from "./menuItem";
import { GroupHeader } from "./groupHeader";
import { MenuItemEditable } from "./menuItemEditable";
import { GraphStats, getWeightDataForGraph, getLengthDataForGraph, getPercentageDataForGraph } from "./graphStats";
import { IconTrash } from "./icons/iconTrash";
import { Locker } from "./locker";
import { Button } from "./button";
import { Thunk_pushScreen } from "../ducks/thunks";
import { updateSettings } from "../models/state";
import { lb } from "lens-shmens";
import { Subscriptions_hasSubscription } from "../utils/subscriptions";
import { ImagePreloader_dynoflex } from "../utils/imagePreloader";
import { HostConfig_resolveUrl } from "../utils/hostConfig";
import { Dialog_confirm } from "../utils/dialog";
import { DatePicker } from "./datePicker";

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
    ...ObjectUtils_keys(props.stats.weight).filter((k) => (props.stats.weight[k] || []).length > 0),
    ...ObjectUtils_keys(props.stats.percentage).filter((k) => (props.stats.percentage[k] || []).length > 0),
    ...ObjectUtils_keys(props.stats.length).filter((k) => (props.stats.length[k] || []).length > 0),
  ];
  const [selectedKey, setSelectedKey] = useState<IStatsKey>(props.initialKey || statsKeys[0] || "weight");
  const movingAverageWindowSize = props.settings.graphOptions[selectedKey]?.movingAverageWindowSize;
  const values = getValues(props.stats, selectedKey);

  if (statsKeys.length === 0) {
    return (
      <View>
        <View className="flex-row items-center justify-center pt-16">
          <Image source={{ uri: HostConfig_resolveUrl(ImagePreloader_dynoflex) }} style={{ width: 180, height: 232 }} />
        </View>
        <Text className="pt-4 pb-6 text-sm text-center text-text-secondary">No measurements added yet</Text>
        <View className="items-center">
          <Button
            name="add-measurements"
            data-cy="add-measurements" data-testid="add-measurements" testID="add-measurements"
            kind="purple"
            onClick={() => props.dispatch(Thunk_pushScreen("stats"))}
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
    <View className="px-4" data-cy={`stats-list-${selectedKey}`} data-testid={`stats-list-${selectedKey}`} testID={`stats-list-${selectedKey}`}>
      <View className="items-center pb-2">
        <Button
          name="add-measurements"
          data-cy="add-measurements" data-testid="add-measurements" testID="add-measurements"
          kind="purple"
          onClick={() => props.dispatch(Thunk_pushScreen("stats"))}
        >
          Add measurements
        </Button>
      </View>
      <GroupHeader name="Selected Measurement Type" />
      <MenuItemEditable
        type="select"
        name="Type"
        value={selectedKey}
        values={statsKeys.map((key) => [key, Stats_name(key)])}
        onChange={(value) => {
          setSelectedKey(value as IStatsKey);
        }}
      />
      {Subscriptions_hasSubscription(props.subscription) && (
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
                })),
              "Update moving average"
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
        <Text className="py-12 text-xl text-center text-text-secondary">
          No {Stats_name(selectedKey)} measurements added yet
        </Text>
      ) : (
        <>
          <GroupHeader name="List of measurements" topPadding={false} />
          {values.map((value) => {
            const convertedValue = Weight_is(value.value)
              ? Weight_convertTo(value.value, props.settings.units)
              : Length_is(value.value)
                ? Length_convertTo(value.value, props.settings.lengthUnits)
                : value.value;
            const onChangeTimestamp = (ts: number): void => {
              if (selectedKey === "weight") {
                EditStats_changeStatWeightTimestamp(props.dispatch, selectedKey, value.index, ts);
              } else if (selectedKey === "bodyfat") {
                EditStats_changeStatPercentageTimestamp(props.dispatch, selectedKey, value.index, ts);
              } else {
                EditStats_changeStatLengthTimestamp(props.dispatch, selectedKey, value.index, ts);
              }
            };
            const onChangeValue = (str: string): void => {
              const num = parseFloat(str);
              if (isNaN(num)) {
                return;
              }
              if (selectedKey === "weight") {
                EditStats_changeStatWeightValue(
                  props.dispatch,
                  selectedKey,
                  value.index,
                  Weight_build(num, props.settings.units)
                );
              } else if (selectedKey === "bodyfat") {
                EditStats_changeStatPercentageValue(props.dispatch, selectedKey, value.index, {
                  value: num,
                  unit: "%",
                });
              } else {
                EditStats_changeStatLengthValue(
                  props.dispatch,
                  selectedKey,
                  value.index,
                  Length_build(num, props.settings.lengthUnits)
                );
              }
            };
            return (
              <MenuItemWrapper key={`${selectedKey}-${value.timestamp}`} name={`${selectedKey}-${value.timestamp}`}>
                <View className="flex-row items-center">
                  <View className="flex-1">
                    <DatePicker testID="input-stats-date" value={value.timestamp} onChange={onChangeTimestamp} />
                  </View>
                  <View className="flex-row flex-1 items-center">
                    <StatValueInput value={+convertedValue.value.toFixed(2)} onChange={onChangeValue} />
                    <Text className="py-3 pl-1" data-cy="input-stats-unit" data-testid="input-stats-unit">
                      {units}
                    </Text>
                  </View>
                  <Pressable
                    className="p-3 nm-delete-stat"
                    data-cy="delete-stat" data-testid="delete-stat" testID="delete-stat"
                    onPress={async () => {
                      if (await Dialog_confirm("Are you sure?")) {
                        if (selectedKey === "weight") {
                          EditStats_deleteWeightStat(props.dispatch, selectedKey, value.index, value.timestamp);
                        } else if (selectedKey === "bodyfat") {
                          EditStats_deletePercentageStat(props.dispatch, selectedKey, value.index, value.timestamp);
                        } else {
                          EditStats_deleteLengthStat(props.dispatch, selectedKey, value.index, value.timestamp);
                        }
                      }
                    }}
                  >
                    <IconTrash />
                  </Pressable>
                </View>
              </MenuItemWrapper>
            );
          })}
        </>
      )}
    </View>
  );
}

interface IStatValueInputProps {
  value: number;
  onChange: (str: string) => void;
}

function StatValueInput(props: IStatValueInputProps): JSX.Element {
  const [text, setText] = useState(String(props.value));

  useEffect(() => {
    setText(String(props.value));
  }, [props.value]);

  return (
    <TextInput
      data-cy="input-stats-value" data-testid="input-stats-value" testID="input-stats-value"
      className="flex-1 w-0 min-w-0 p-2 text-right text-text-link bg-background-default"
      keyboardType="numeric"
      value={text}
      onChangeText={setText}
      onBlur={() => props.onChange(text)}
      selectTextOnFocus
    />
  );
}
