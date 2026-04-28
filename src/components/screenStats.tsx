import { JSX, ReactNode, useRef, useState } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { Thunk_pullScreen } from "../ducks/thunks";
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
  IStatsKey,
} from "../types";
import { Button } from "./button";
import { ObjectUtils_keys } from "../utils/object";
import { Weight_convertTo, Weight_build } from "../models/weight";
import { Length_convertTo, Length_build } from "../models/length";
import { navigationRef } from "../navigation/navigationRef";
import { EditStats_addWeightStats, EditStats_addLengthStats, EditStats_addPercentageStats } from "../models/editStats";
import { StringUtils_dashcase } from "../utils/string";
import { INavCommon } from "../models/state";
import { useNavOptions } from "../navigation/useNavOptions";
import { Input } from "./input";
import { IconFilter } from "./icons/iconFilter";
import { HelpStats } from "./help/helpStats";
import { SendMessage_toIosAndAndroid } from "../utils/sendMessage";
import { HealthSync_eligibleForAppleHealth, HealthSync_eligibleForGoogleHealth } from "../lib/healthSync";
import { MenuItemEditable } from "./menuItemEditable";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  stats: IStats;
  navCommon: INavCommon;
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

type IValuesRef = React.MutableRefObject<Partial<Record<IStatsKey, string>>>;

export function ScreenStats(props: IProps): JSX.Element {
  const { statsEnabled, lengthUnits, units } = props.settings;
  const lastWeightStats = ObjectUtils_keys(props.stats.weight).reduce<Partial<Record<keyof IStatsWeight, IWeight>>>(
    (acc, key) => {
      const value = (props.stats.weight[key] || [])[0]?.value;
      if (value != null) {
        acc[key] = Weight_convertTo(value, props.settings.units);
      }
      return acc;
    },
    {}
  );
  const lastLengthStats = ObjectUtils_keys(props.stats.length).reduce<Partial<Record<keyof IStatsLength, ILength>>>(
    (acc, key) => {
      const value = (props.stats.length[key] || [])[0]?.value;
      if (value != null) {
        acc[key] = Length_convertTo(value, props.settings.lengthUnits);
      }
      return acc;
    },
    {}
  );
  const lastPercentageStats = ObjectUtils_keys(props.stats.percentage).reduce<
    Partial<Record<keyof IStatsPercentage, IPercentage>>
  >((acc, key) => {
    const value = (props.stats.percentage[key] || [])[0]?.value;
    if (value != null) {
      acc[key] = value;
    }
    return acc;
  }, {});
  const [syncToAppleHealth, setSyncToAppleHealth] = useState(!!props.settings.appleHealthSyncMeasurements);
  const [syncToGoogleHealth, setSyncToGoogleHealth] = useState(!!props.settings.googleHealthSyncMeasurements);
  const [clearKey, setClearKey] = useState(0);

  const valuesRef: IValuesRef = useRef<Partial<Record<IStatsKey, string>>>({});

  function saveWeight(): Partial<Record<keyof IStatsWeight, IWeight>> {
    const payload = ObjectUtils_keys(statsEnabled.weight).reduce<Partial<Record<keyof IStatsWeight, IWeight>>>(
      (acc, key) => {
        const isEnabled = statsEnabled.weight[key];
        if (isEnabled) {
          const stringValue = valuesRef.current[key];
          if (stringValue) {
            const value = parseFloat(stringValue);
            if (!isNaN(value)) {
              acc[key] = Weight_build(value, units);
            }
          }
        }
        return acc;
      },
      {}
    );
    EditStats_addWeightStats(props.dispatch, payload);
    return payload;
  }

  function saveLength(): Partial<Record<keyof IStatsLength, ILength>> {
    const payload = ObjectUtils_keys(statsEnabled.length).reduce<Partial<Record<keyof IStatsLength, ILength>>>(
      (acc, key) => {
        const isEnabled = statsEnabled.length[key];
        if (isEnabled) {
          const stringValue = valuesRef.current[key];
          if (stringValue) {
            const value = parseFloat(stringValue);
            if (!isNaN(value)) {
              acc[key] = Length_build(value, lengthUnits);
            }
          }
        }
        return acc;
      },
      {}
    );
    EditStats_addLengthStats(props.dispatch, payload);
    return payload;
  }

  function savePercentage(): Partial<Record<keyof IStatsPercentage, IPercentage>> {
    const payload = ObjectUtils_keys(statsEnabled.percentage).reduce<
      Partial<Record<keyof IStatsPercentage, IPercentage>>
    >((acc, key) => {
      const isEnabled = statsEnabled.percentage[key];
      if (isEnabled) {
        const stringValue = valuesRef.current[key];
        if (stringValue) {
          const value = parseFloat(stringValue);
          if (!isNaN(value)) {
            acc[key] = { value, unit: "%" };
          }
        }
      }
      return acc;
    }, {});
    EditStats_addPercentageStats(props.dispatch, payload);
    return payload;
  }

  function save(): void {
    let updates: IUpdates = { ...saveWeight() };
    updates = { ...updates, ...saveLength() };
    updates = { ...updates, ...savePercentage() };
    if (
      (HealthSync_eligibleForAppleHealth() && syncToAppleHealth) ||
      (HealthSync_eligibleForGoogleHealth() && syncToGoogleHealth)
    ) {
      const updatesForHealthSync = getUpdatesForHealthSync(updates);
      SendMessage_toIosAndAndroid({ type: "finishMeasurements", ...updatesForHealthSync });
    }
    props.dispatch(Thunk_pullScreen());
  }

  function getUpdatesForHealthSync(updates: IUpdates): IHealthUpdates {
    const healthSyncUpdates: IHealthUpdates = {};
    const timestamp = Date.now();
    ObjectUtils_keys(updates).forEach((key) => {
      if (key === "weight") {
        healthSyncUpdates[key] = JSON.stringify({ value: updates[key], timestamp });
      } else if (key === "bodyfat") {
        healthSyncUpdates[key] = JSON.stringify({ value: updates[key], timestamp });
      } else if (key === "waist") {
        healthSyncUpdates[key] = JSON.stringify({ value: updates[key], timestamp });
      }
    });
    return healthSyncUpdates;
  }

  useNavOptions({
    navTitle: "Add Measurements",
    navHelpContent: <HelpStats />,
    navRightButtons: [
      <Pressable
        key="filter"
        className="p-2 nm-modify-stats"
        data-testid="modify-stats"
        testID="modify-stats"
        onPress={() => navigationRef.navigate("statsSettingsModal")}
      >
        <IconFilter />
      </Pressable>,
    ],
  });

  return (
    <View className="px-4">
      <Text className="py-2 text-sm text-text-secondary">
        All fields are optional, input only the fields you want this time. Empty fields won't be added.
      </Text>
      <View className="items-center">
        <Button
          data-testid="clear-stats-fields"
          testID="clear-stats-fields"
          name="clear-stats-fields"
          kind="grayv2"
          onClick={() => {
            valuesRef.current = {};
            setClearKey((k) => k + 1);
          }}
        >
          Clear All Fields
        </Button>
      </View>
      {statsEnabled.length.neck && (
        <SingleLine>
          <StatInput
            name="neck"
            label="Neck"
            defaultValue={lastLengthStats.neck?.value}
            unit={lengthUnits}
            clearKey={clearKey}
            valuesRef={valuesRef}
          />
        </SingleLine>
      )}
      {statsEnabled.weight && (
        <SingleLine>
          <StatInput
            name="weight"
            label="Bodyweight"
            defaultValue={lastWeightStats.weight?.value}
            unit={units}
            clearKey={clearKey}
            valuesRef={valuesRef}
          />
        </SingleLine>
      )}
      {statsEnabled.percentage.bodyfat && (
        <SingleLine>
          <StatInput
            name="bodyfat"
            label="Bodyfat"
            defaultValue={lastPercentageStats.bodyfat?.value}
            unit="%"
            clearKey={clearKey}
            valuesRef={valuesRef}
          />
        </SingleLine>
      )}
      {statsEnabled.length.shoulders && (
        <SingleLine>
          <StatInput
            name="shoulders"
            label="Shoulders"
            defaultValue={lastLengthStats.shoulders?.value}
            unit={lengthUnits}
            clearKey={clearKey}
            valuesRef={valuesRef}
          />
        </SingleLine>
      )}
      {(statsEnabled.length.bicepLeft || statsEnabled.length.bicepRight) && (
        <DoubleLine
          first={
            statsEnabled.length.bicepLeft && (
              <StatInput
                name="bicepLeft"
                label="Bicep Left"
                defaultValue={lastLengthStats.bicepLeft?.value}
                unit={lengthUnits}
                clearKey={clearKey}
                valuesRef={valuesRef}
              />
            )
          }
          second={
            statsEnabled.length.bicepRight && (
              <StatInput
                name="bicepRight"
                label="Bicep Right"
                defaultValue={lastLengthStats.bicepRight?.value}
                unit={lengthUnits}
                clearKey={clearKey}
                valuesRef={valuesRef}
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
                name="forearmLeft"
                label="Forearm Left"
                defaultValue={lastLengthStats.forearmLeft?.value}
                unit={lengthUnits}
                clearKey={clearKey}
                valuesRef={valuesRef}
              />
            )
          }
          second={
            statsEnabled.length.forearmRight && (
              <StatInput
                name="forearmRight"
                label="Forearm Right"
                defaultValue={lastLengthStats.forearmRight?.value}
                unit={lengthUnits}
                clearKey={clearKey}
                valuesRef={valuesRef}
              />
            )
          }
        />
      )}
      {statsEnabled.length.chest && (
        <SingleLine>
          <StatInput
            name="chest"
            label="Chest"
            defaultValue={lastLengthStats.chest?.value}
            unit={lengthUnits}
            clearKey={clearKey}
            valuesRef={valuesRef}
          />
        </SingleLine>
      )}
      {statsEnabled.length.waist && (
        <SingleLine>
          <StatInput
            name="waist"
            label="Waist"
            defaultValue={lastLengthStats.waist?.value}
            unit={lengthUnits}
            clearKey={clearKey}
            valuesRef={valuesRef}
          />
        </SingleLine>
      )}
      {statsEnabled.length.hips && (
        <SingleLine>
          <StatInput
            name="hips"
            label="Hips"
            defaultValue={lastLengthStats.hips?.value}
            unit={lengthUnits}
            clearKey={clearKey}
            valuesRef={valuesRef}
          />
        </SingleLine>
      )}
      {(statsEnabled.length.thighLeft || statsEnabled.length.thighRight) && (
        <DoubleLine
          first={
            statsEnabled.length.thighLeft && (
              <StatInput
                name="thighLeft"
                label="Thigh Left"
                defaultValue={lastLengthStats.thighLeft?.value}
                unit={lengthUnits}
                clearKey={clearKey}
                valuesRef={valuesRef}
              />
            )
          }
          second={
            statsEnabled.length.thighRight && (
              <StatInput
                name="thighRight"
                label="Thigh Right"
                defaultValue={lastLengthStats.thighRight?.value}
                unit={lengthUnits}
                clearKey={clearKey}
                valuesRef={valuesRef}
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
                name="calfLeft"
                label="Calf Left"
                defaultValue={lastLengthStats.calfLeft?.value}
                unit={lengthUnits}
                clearKey={clearKey}
                valuesRef={valuesRef}
              />
            )
          }
          second={
            statsEnabled.length.calfRight && (
              <StatInput
                name="calfRight"
                label="Calf Right"
                defaultValue={lastLengthStats.calfRight?.value}
                unit={lengthUnits}
                clearKey={clearKey}
                valuesRef={valuesRef}
              />
            )
          }
        />
      )}
      {HealthSync_eligibleForAppleHealth() && (
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
      {HealthSync_eligibleForGoogleHealth() && (
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
      <View className="items-center py-4 mb-2">
        <Button
          name="add-stats"
          tabIndex={1}
          className="ls-add-stats"
          data-testid="add-stats"
          testID="add-stats"
          kind="purple"
          onClick={save}
        >
          Done
        </Button>
      </View>
    </View>
  );
}

interface IStatInputProps {
  name: IStatsKey;
  label: string;
  defaultValue?: number | string;
  unit: IUnit | ILengthUnit | IPercentageUnit;
  clearKey: number;
  valuesRef: IValuesRef;
}

interface ISingleLineProps {
  children: ReactNode;
}

function SingleLine(props: ISingleLineProps): JSX.Element {
  return (
    <View className="my-2">
      <View className="w-48 mx-auto">{props.children}</View>
    </View>
  );
}

interface IDoubleLineProps {
  first: ReactNode;
  second: ReactNode;
}

function DoubleLine(props: IDoubleLineProps): JSX.Element {
  return (
    <View className="flex-row my-2">
      <View className="flex-1 mr-1">{props.first}</View>
      <View className="flex-1 ml-1">{props.second}</View>
    </View>
  );
}

function StatInput(props: IStatInputProps): JSX.Element {
  const testName = StringUtils_dashcase(props.label.toLowerCase());
  return (
    <Input
      key={`${props.name}-${props.clearKey}`}
      label={`${props.label} (${props.unit})`}
      labelSize="xs"
      defaultValue={props.defaultValue}
      type={"number"}
      placeholder="e.g. 10"
      min={0}
      step="0.01"
      tabIndex={1}
      data-testid={`input-stats-${testName}`}
      testID={`input-stats-${testName}`}
      identifier={`input-stats-${testName}`}
      changeHandler={(e) => {
        props.valuesRef.current[props.name] = e.success ? e.data : "";
      }}
    />
  );
}
