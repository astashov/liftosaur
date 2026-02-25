import { h, JSX, ComponentChildren } from "preact";
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
} from "../types";
import { Button } from "./button";
import { forwardRef, Ref, useRef, useState, memo } from "preact/compat";
import { ObjectUtils_keys } from "../utils/object";
import { Weight_convertTo, Weight_build } from "../models/weight";
import { Length_convertTo, Length_build } from "../models/length";
import { ModalStats } from "./modalStats";
import { EditStats_addWeightStats, EditStats_addLengthStats, EditStats_addPercentageStats } from "../models/editStats";
import { StringUtils_dashcase } from "../utils/string";
import { INavCommon } from "../models/state";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { Input } from "./input";
import { IconFilter } from "./icons/iconFilter";
import { HelpStats } from "./help/helpStats";
import { SendMessage_toIosAndAndroid, SendMessage_isIos } from "../utils/sendMessage";
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
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [syncToAppleHealth, setSyncToAppleHealth] = useState(!!props.settings.appleHealthSyncMeasurements);
  const [syncToGoogleHealth, setSyncToGoogleHealth] = useState(!!props.settings.googleHealthSyncMeasurements);

  const refs = {
    weight: useRef<HTMLInputElement>(),
    bodyfat: useRef<HTMLInputElement>(),
    neck: useRef<HTMLInputElement>(),
    shoulders: useRef<HTMLInputElement>(),
    bicepLeft: useRef<HTMLInputElement>(),
    bicepRight: useRef<HTMLInputElement>(),
    forearmLeft: useRef<HTMLInputElement>(),
    forearmRight: useRef<HTMLInputElement>(),
    chest: useRef<HTMLInputElement>(),
    waist: useRef<HTMLInputElement>(),
    hips: useRef<HTMLInputElement>(),
    thighLeft: useRef<HTMLInputElement>(),
    thighRight: useRef<HTMLInputElement>(),
    calfLeft: useRef<HTMLInputElement>(),
    calfRight: useRef<HTMLInputElement>(),
  };

  function saveWeight(): Partial<Record<keyof IStatsWeight, IWeight>> {
    const payload = ObjectUtils_keys(statsEnabled.weight).reduce<Partial<Record<keyof IStatsWeight, IWeight>>>(
      (acc, key) => {
        const isEnabled = statsEnabled.weight[key];
        if (isEnabled) {
          const stringValue = refs[key]?.current.value;
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
          const stringValue = refs[key]?.current.value;
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
        const stringValue = refs[key]?.current.value;
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
          navCommon={props.navCommon}
          dispatch={props.dispatch}
          helpContent={<HelpStats />}
          rightButtons={[
            <button className="p-2 ls-modify-stats" data-cy="modify-stats" onClick={() => setIsModalVisible(true)}>
              <IconFilter />
            </button>,
          ]}
          title="Add Measurements"
        />
      }
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
      addons={
        <ModalStats
          isHidden={!isModalVisible}
          settings={props.settings}
          dispatch={props.dispatch}
          onClose={() => setIsModalVisible(false)}
        />
      }
    >
      <section className="px-4">
        <p className="py-2 text-sm text-text-secondary">
          All fields are optional, input only the fields you want this time. Empty fields won't be added.
        </p>
        <div className="text-center">
          <Button
            data-cy="clear-stats-fields"
            name="clear-stats-fields"
            kind="grayv2"
            onClick={() => {
              for (const key of ObjectUtils_keys(refs)) {
                if (refs[key]?.current) {
                  refs[key].current.value = "";
                }
              }
            }}
          >
            Clear All Fields
          </Button>
        </div>
        {statsEnabled.length.neck && (
          <SingleLine>
            <StatInput ref={refs.neck} label="Neck" value={lastLengthStats.neck?.value} unit={lengthUnits} />
          </SingleLine>
        )}
        {statsEnabled.weight && (
          <SingleLine>
            <StatInput ref={refs.weight} label="Bodyweight" value={lastWeightStats.weight?.value} unit={units} />
          </SingleLine>
        )}
        {statsEnabled.percentage.bodyfat && (
          <SingleLine>
            <StatInput ref={refs.bodyfat} label="Bodyfat" value={lastPercentageStats.bodyfat?.value} unit="%" />
          </SingleLine>
        )}
        {statsEnabled.length.shoulders && (
          <SingleLine>
            <StatInput
              ref={refs.shoulders}
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
                  ref={refs.bicepLeft}
                  label="Bicep Left"
                  value={lastLengthStats.bicepLeft?.value}
                  unit={lengthUnits}
                />
              )
            }
            second={
              statsEnabled.length.bicepRight && (
                <StatInput
                  ref={refs.bicepRight}
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
                  ref={refs.forearmLeft}
                  label="Forearm Left"
                  value={lastLengthStats.forearmLeft?.value}
                  unit={lengthUnits}
                />
              )
            }
            second={
              statsEnabled.length.forearmRight && (
                <StatInput
                  ref={refs.forearmRight}
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
            <StatInput label="Chest" ref={refs.chest} value={lastLengthStats.chest?.value} unit={lengthUnits} />
          </SingleLine>
        )}
        {statsEnabled.length.waist && (
          <SingleLine>
            <StatInput ref={refs.waist} label="Waist" value={lastLengthStats.waist?.value} unit={lengthUnits} />
          </SingleLine>
        )}
        {statsEnabled.length.hips && (
          <SingleLine>
            <StatInput ref={refs.hips} label="Hips" value={lastLengthStats.hips?.value} unit={lengthUnits} />
          </SingleLine>
        )}
        {(statsEnabled.length.thighLeft || statsEnabled.length.thighRight) && (
          <DoubleLine
            first={
              statsEnabled.length.thighLeft && (
                <StatInput
                  ref={refs.thighLeft}
                  label="Thigh Left"
                  value={lastLengthStats.thighLeft?.value}
                  unit={lengthUnits}
                />
              )
            }
            second={
              statsEnabled.length.thighRight && (
                <StatInput
                  ref={refs.thighRight}
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
                  ref={refs.calfLeft}
                  label="Calf Left"
                  value={lastLengthStats.calfLeft?.value}
                  unit={lengthUnits}
                />
              )
            }
            second={
              statsEnabled.length.calfRight && (
                <StatInput
                  ref={refs.calfRight}
                  label="Calf Right"
                  value={lastLengthStats.calfRight?.value}
                  unit={lengthUnits}
                />
              )
            }
          />
        )}
        {HealthSync_eligibleForAppleHealth() && (
          <div>
            <MenuItemEditable
              name="Sync to Apple Health"
              type="boolean"
              value={syncToAppleHealth ? "true" : "false"}
              onChange={(newValue?: string) => {
                setSyncToAppleHealth(newValue === "true");
              }}
            />
          </div>
        )}
        {HealthSync_eligibleForGoogleHealth() && (
          <div>
            <MenuItemEditable
              name="Sync to Google Health Connect"
              type="boolean"
              value={syncToGoogleHealth ? "true" : "false"}
              onChange={(newValue?: string) => {
                setSyncToGoogleHealth(newValue === "true");
              }}
            />
          </div>
        )}
        <div className="py-4 mb-2 text-center">
          <Button
            name="add-stats"
            tabIndex={1}
            className="ls-add-stats"
            data-cy="add-stats"
            kind="purple"
            onClick={save}
          >
            Done
          </Button>
        </div>
      </section>
    </Surface>
  );
}

interface IInputProps {
  label: string;
  value?: number | string;
  unit: IUnit | ILengthUnit | IPercentageUnit;
}

interface ISingleLineProps {
  children: ComponentChildren;
}

function SingleLine(props: ISingleLineProps): JSX.Element {
  return (
    <div className="my-2">
      <div className="w-48 mx-auto text-center">{props.children}</div>
    </div>
  );
}

interface IDoubleLineProps {
  first: ComponentChildren;
  second: ComponentChildren;
}

function DoubleLine(props: IDoubleLineProps): JSX.Element {
  return (
    <div className="flex my-2 text-center">
      <div className="flex-1 mr-1 text-center">{props.first}</div>
      <div className="flex-1 ml-1 text-center">{props.second}</div>
    </div>
  );
}

const StatInput = memo(
  forwardRef((props: IInputProps, ref: Ref<HTMLInputElement>): JSX.Element => {
    const name = StringUtils_dashcase(props.label.toLowerCase());
    return (
      <Input
        label={`${props.label} (${props.unit})`}
        labelSize="xs"
        defaultValue={props.value}
        ref={ref}
        type={SendMessage_isIos() ? "number" : "tel"}
        placeholder="e.g. 10"
        min="0"
        step="0.01"
        tabIndex={1}
        data-cy={`input-stats-${name}`}
      />
    );
  })
);
