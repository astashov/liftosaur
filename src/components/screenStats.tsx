import React, { JSX } from "react";
import { TouchableOpacity, View } from "react-native";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";
import {
  ISettings,
  IUnit,
  ILengthUnit,
  IStats,
  IWeight,
  ILength,
  IStatsWeight,
  IStatsLength,
  IStatsPercentage,
  IPercentage,
  IPercentageUnit,
} from "../types";
import { Button } from "./button";
import { useState } from "react";
import { ObjectUtils } from "../utils/object";
import { Weight } from "../models/weight";
import { Length } from "../models/length";
import { ModalStats } from "./modalStats";
import { EditStats } from "../models/editStats";
import { StringUtils } from "../utils/string";
import { ILoading } from "../models/state";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { IScreen, Screen } from "../models/screen";
import { Footer2View } from "./footer2";
import { Input } from "./input";
import { IconFilter } from "./icons/iconFilter";
import { HelpStats } from "./help/helpStats";
import { SendMessage } from "../utils/sendMessage";
import { HealthSync } from "../lib/healthSync";
import { MenuItemEditable } from "./menuItemEditable";
import { LftText } from "./lftText";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  stats: IStats;
  loading: ILoading;
  screenStack: IScreen[];
}

interface IUpdates {
  bodyfat?: IPercentage;
  weight?: IWeight;
  waist?: ILength;
}

interface IHealthUpdates {
  bodyfat?: string;
  weight?: string;
  waist?: string;
}

export function ScreenStats(props: IProps): JSX.Element {
  const { statsEnabled, lengthUnits, units } = props.settings;
  const lastWeightStats = ObjectUtils.keys(props.stats.weight).reduce<Partial<Record<keyof IStatsWeight, IWeight>>>(
    (acc, key) => {
      const value = (props.stats.weight[key] || [])[0]?.value;
      if (value != null) {
        acc[key] = Weight.convertTo(value, props.settings.units);
      }
      return acc;
    },
    {}
  );
  const lastLengthStats = ObjectUtils.keys(props.stats.length).reduce<Partial<Record<keyof IStatsLength, ILength>>>(
    (acc, key) => {
      const value = (props.stats.length[key] || [])[0]?.value;
      if (value != null) {
        acc[key] = Length.convertTo(value, props.settings.lengthUnits);
      }
      return acc;
    },
    {}
  );
  const lastPercentageStats = ObjectUtils.keys(props.stats.percentage).reduce<
    Partial<Record<keyof IStatsPercentage, IPercentage>>
  >((acc, key) => {
    const value = (props.stats.percentage[key] || [])[0]?.value;
    if (value != null) {
      acc[key] = value;
    }
    return acc;
  }, {});
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [syncToAppleHealth, setSyncToAppleHealth] = useState(!!props.settings.appleHealthSyncMeasurements);
  const [syncToGoogleHealth, setSyncToGoogleHealth] = useState(!!props.settings.googleHealthSyncMeasurements);

  const [weight, setWeight] = useState<number | undefined>(undefined);
  const [bodyfat, setBodyfat] = useState<number | undefined>(undefined);
  const [neck, setNeck] = useState<number | undefined>(undefined);
  const [shoulders, setShoulders] = useState<number | undefined>(undefined);
  const [bicepLeft, setBicepLeft] = useState<number | undefined>(undefined);
  const [bicepRight, setBicepRight] = useState<number | undefined>(undefined);
  const [forearmLeft, setForearmLeft] = useState<number | undefined>(undefined);
  const [forearmRight, setForearmRight] = useState<number | undefined>(undefined);
  const [chest, setChest] = useState<number | undefined>(undefined);
  const [waist, setWaist] = useState<number | undefined>(undefined);
  const [hips, setHips] = useState<number | undefined>(undefined);
  const [thighLeft, setThighLeft] = useState<number | undefined>(undefined);
  const [thighRight, setThighRight] = useState<number | undefined>(undefined);
  const [calfLeft, setCalfLeft] = useState<number | undefined>(undefined);
  const [calfRight, setCalfRight] = useState<number | undefined>(undefined);

  const values = {
    weight,
    bodyfat,
    neck,
    shoulders,
    bicepLeft,
    bicepRight,
    forearmLeft,
    forearmRight,
    chest,
    waist,
    hips,
    thighLeft,
    thighRight,
    calfLeft,
    calfRight,
  };

  function saveWeight(): Partial<Record<keyof IStatsWeight, IWeight>> {
    const payload = ObjectUtils.keys(statsEnabled.weight).reduce<Partial<Record<keyof IStatsWeight, IWeight>>>(
      (acc, key) => {
        const isEnabled = statsEnabled.weight[key];
        if (isEnabled) {
          const value = values[key];
          if (value != null && !isNaN(value)) {
            acc[key] = Weight.build(value, units);
          }
        }
        return acc;
      },
      {}
    );
    EditStats.addWeightStats(props.dispatch, payload);
    return payload;
  }

  function saveLength(): Partial<Record<keyof IStatsLength, ILength>> {
    const payload = ObjectUtils.keys(statsEnabled.length).reduce<Partial<Record<keyof IStatsLength, ILength>>>(
      (acc, key) => {
        const isEnabled = statsEnabled.length[key];
        if (isEnabled) {
          const value = values[key];
          if (value != null && !isNaN(value)) {
            acc[key] = Length.build(value, lengthUnits);
          }
        }
        return acc;
      },
      {}
    );
    EditStats.addLengthStats(props.dispatch, payload);
    return payload;
  }

  function savePercentage(): Partial<Record<keyof IStatsPercentage, IPercentage>> {
    const payload = ObjectUtils.keys(statsEnabled.percentage).reduce<
      Partial<Record<keyof IStatsPercentage, IPercentage>>
    >((acc, key) => {
      const isEnabled = statsEnabled.percentage[key];
      if (isEnabled) {
        const value = values[key];
        if (value != null && !isNaN(value)) {
          acc[key] = { value, unit: "%" };
        }
      }
      return acc;
    }, {});
    EditStats.addPercentageStats(props.dispatch, payload);
    return payload;
  }

  function save(): void {
    let updates: IUpdates = { ...saveWeight() };
    updates = { ...updates, ...saveLength() };
    updates = { ...updates, ...savePercentage() };
    if (
      (HealthSync.eligibleForAppleHealth() && syncToAppleHealth) ||
      (HealthSync.eligibleForGoogleHealth() && syncToGoogleHealth)
    ) {
      const updatesForHealthSync = getUpdatesForHealthSync(updates);
      SendMessage.toIosAndAndroid({ type: "finishMeasurements", ...updatesForHealthSync });
    }
    props.dispatch(Thunk.pullScreen());
  }

  function getUpdatesForHealthSync(updates: IUpdates): IHealthUpdates {
    const healthSyncUpdates: IHealthUpdates = {};
    const timestamp = Date.now();
    ObjectUtils.keys(updates).forEach((key) => {
      if (key === "weight") {
        healthSyncUpdates[key] = JSON.stringify({
          value: updates[key],
          timestamp,
        });
      } else if (key === "bodyfat") {
        healthSyncUpdates[key] = JSON.stringify({
          value: updates[key],
          timestamp,
        });
      } else if (key === "waist") {
        healthSyncUpdates[key] = JSON.stringify({
          value: updates[key],
          timestamp,
        });
      }
    });
    return healthSyncUpdates;
  }

  return (
    <Surface
      navbar={
        <NavbarView
          loading={props.loading}
          dispatch={props.dispatch}
          helpContent={<HelpStats />}
          rightButtons={[
            <TouchableOpacity
              key={0}
              className="p-2 ls-modify-stats"
              data-cy="modify-stats"
              onPress={() => setIsModalVisible(true)}
            >
              <IconFilter />
            </TouchableOpacity>,
          ]}
          screenStack={props.screenStack}
          title="Add Measurements"
        />
      }
      footer={<Footer2View dispatch={props.dispatch} screen={Screen.current(props.screenStack)} />}
      addons={
        <ModalStats
          isHidden={!isModalVisible}
          settings={props.settings}
          dispatch={props.dispatch}
          onClose={() => setIsModalVisible(false)}
        />
      }
    >
      <View className="px-4">
        <LftText className="py-2 text-sm text-grayv2-main">
          All fields are optional, input only the fields you want this time. Empty fields won't be added.
        </LftText>
        {statsEnabled.length.neck && (
          <SingleLine>
            <StatInput onChange={setNeck} label="Neck" value={lastLengthStats.neck?.value} unit={lengthUnits} />
          </SingleLine>
        )}
        {statsEnabled.weight && (
          <SingleLine>
            <StatInput onChange={setWeight} label="Bodyweight" value={lastWeightStats.weight?.value} unit={units} />
          </SingleLine>
        )}
        {statsEnabled.percentage.bodyfat && (
          <SingleLine>
            <StatInput onChange={setBodyfat} label="Bodyfat" value={lastPercentageStats.bodyfat?.value} unit="%" />
          </SingleLine>
        )}
        {statsEnabled.length.shoulders && (
          <SingleLine>
            <StatInput
              onChange={setShoulders}
              label="Shoulders"
              value={lastLengthStats.shoulders?.value}
              unit={lengthUnits}
            />
          </SingleLine>
        )}
        {(statsEnabled.length.bicepLeft || statsEnabled.length.bicepRight) && (
          <DoubleLine
            first={
              statsEnabled.length.bicepLeft && (
                <StatInput
                  onChange={setBicepLeft}
                  label="Bicep Left"
                  value={lastLengthStats.bicepLeft?.value}
                  unit={lengthUnits}
                />
              )
            }
            second={
              statsEnabled.length.bicepRight && (
                <StatInput
                  onChange={setBicepRight}
                  label="Bicep Right"
                  value={lastLengthStats.bicepRight?.value}
                  unit={lengthUnits}
                />
              )
            }
          />
        )}
        {(statsEnabled.length.forearmLeft || statsEnabled.length.forearmRight) && (
          <DoubleLine
            first={
              statsEnabled.length.forearmLeft && (
                <StatInput
                  onChange={setForearmLeft}
                  label="Forearm Left"
                  value={lastLengthStats.forearmLeft?.value}
                  unit={lengthUnits}
                />
              )
            }
            second={
              statsEnabled.length.forearmRight && (
                <StatInput
                  onChange={setForearmRight}
                  label="Forearm Right"
                  value={lastLengthStats.forearmRight?.value}
                  unit={lengthUnits}
                />
              )
            }
          />
        )}
        {statsEnabled.length.chest && (
          <SingleLine>
            <StatInput label="Chest" onChange={setChest} value={lastLengthStats.chest?.value} unit={lengthUnits} />
          </SingleLine>
        )}
        {statsEnabled.length.waist && (
          <SingleLine>
            <StatInput onChange={setWaist} label="Waist" value={lastLengthStats.waist?.value} unit={lengthUnits} />
          </SingleLine>
        )}
        {statsEnabled.length.hips && (
          <SingleLine>
            <StatInput onChange={setHips} label="Hips" value={lastLengthStats.hips?.value} unit={lengthUnits} />
          </SingleLine>
        )}
        {(statsEnabled.length.thighLeft || statsEnabled.length.thighRight) && (
          <DoubleLine
            first={
              statsEnabled.length.thighLeft && (
                <StatInput
                  onChange={setThighLeft}
                  label="Thigh Left"
                  value={lastLengthStats.thighLeft?.value}
                  unit={lengthUnits}
                />
              )
            }
            second={
              statsEnabled.length.thighRight && (
                <StatInput
                  onChange={setThighRight}
                  label="Thigh Right"
                  value={lastLengthStats.thighRight?.value}
                  unit={lengthUnits}
                />
              )
            }
          />
        )}
        {(statsEnabled.length.calfLeft || statsEnabled.length.calfRight) && (
          <DoubleLine
            first={
              statsEnabled.length.calfLeft && (
                <StatInput
                  onChange={setCalfLeft}
                  label="Calf Left"
                  value={lastLengthStats.calfLeft?.value}
                  unit={lengthUnits}
                />
              )
            }
            second={
              statsEnabled.length.calfRight && (
                <StatInput
                  onChange={setCalfRight}
                  label="Calf Right"
                  value={lastLengthStats.calfRight?.value}
                  unit={lengthUnits}
                />
              )
            }
          />
        )}
        {HealthSync.eligibleForAppleHealth() && (
          <View>
            <MenuItemEditable
              name="Sync to Apple Health"
              type="boolean"
              value={syncToAppleHealth ? "true" : "false"}
              onChange={(newValue?: string) => {
                setSyncToAppleHealth(newValue === "true");
              }}
            />
          </View>
        )}
        {HealthSync.eligibleForGoogleHealth() && (
          <View>
            <MenuItemEditable
              name="Sync to Google Health Connect"
              type="boolean"
              value={syncToGoogleHealth ? "true" : "false"}
              onChange={(newValue?: string) => {
                setSyncToGoogleHealth(newValue === "true");
              }}
            />
          </View>
        )}
        <View className="flex flex-row justify-center py-4 mb-2 text-center">
          <Button name="add-stats" className="ls-add-stats" data-cy="add-stats" kind="orange" onClick={save}>
            Done
          </Button>
        </View>
      </View>
    </Surface>
  );
}

interface IInputProps {
  label: string;
  value?: number | string;
  unit: IUnit | ILengthUnit | IPercentageUnit;
  onChange?: (value: number) => void;
}

interface ISingleLineProps {
  children: React.ReactNode;
}

function SingleLine(props: ISingleLineProps): JSX.Element {
  return (
    <View className="my-2">
      <View className="w-48 mx-auto text-center">{props.children}</View>
    </View>
  );
}

interface IDoubleLineProps {
  first: React.ReactNode;
  second: React.ReactNode;
}

function DoubleLine(props: IDoubleLineProps): JSX.Element {
  return (
    <View className="flex flex-row my-2 text-center">
      <View className="flex-1 mr-1 text-center">{props.first}</View>
      <View className="flex-1 ml-1 text-center">{props.second}</View>
    </View>
  );
}

const StatInput = (props: IInputProps): JSX.Element => {
  const name = StringUtils.dashcase(props.label.toLowerCase());
  return (
    <Input
      label={`${props.label} (${props.unit})`}
      labelSize="xs"
      value={`${props.value}`}
      changeHandler={(result) => {
        if (result.success && props.onChange) {
          props.onChange(parseFloat(result.data));
        }
      }}
      className="w-full"
      type="numeric"
      placeholder="e.g. 10"
      min="0"
      step="0.01"
      tabIndex={1}
      data-cy={`input-stats-${name}`}
    />
  );
};
