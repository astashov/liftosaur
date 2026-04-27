import { memo, useCallback, type JSX } from "react";
import { View } from "react-native";
import { Text } from "../../../components/primitives/text";
import { lb } from "lens-shmens";
import { GroupHeader } from "../../../components/groupHeader";
import { Input, IValidationError } from "../../../components/input";
import { MenuItemValue } from "../../../components/menuItemEditable";
import { Modal } from "../../../components/modal";
import { ISettings, IUnit, IScreenMuscle } from "../../../types";
import { ObjectUtils_keys, ObjectUtils_fromArray } from "../../../utils/object";
import { Muscle_getAvailableMuscleGroups, Muscle_getMuscleGroupName } from "../../../models/muscle";
import { LinkButton } from "../../../components/linkButton";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IEither } from "../../../utils/types";

interface IModalPlannerSettingsProps {
  settings: ISettings;
  inApp: boolean;
  onShowEditMuscleGroups: () => void;
  dispatch: ILensDispatch<ISettings>;
  onClose: () => void;
}

function parseAndClamp(
  e: IEither<string, Set<IValidationError>>,
  min?: number,
  max?: number,
  isInt: boolean = true
): number | undefined {
  if (!e.success) {
    return undefined;
  }
  const value = isInt ? parseInt(e.data, 10) : parseFloat(e.data);
  if (isNaN(value)) {
    return undefined;
  }
  let clamped = value;
  if (min != null) {
    clamped = Math.max(min, clamped);
  }
  if (max != null) {
    clamped = Math.min(max, clamped);
  }
  return clamped;
}

export function ModalPlannerSettingsContent(props: IModalPlannerSettingsProps): JSX.Element {
  const { dispatch, settings } = props;
  const availableMuscleGroups = Muscle_getAvailableMuscleGroups(settings);

  let allWeeklySetsMin: number | undefined;
  if (
    ObjectUtils_keys(settings.planner.weeklyRangeSets).every(
      (k) => settings.planner.weeklyRangeSets[k]?.[0] === settings.planner.weeklyRangeSets.abs?.[0]
    )
  ) {
    allWeeklySetsMin = settings.planner.weeklyRangeSets.abs?.[0];
  }

  let allWeeklySetsMax: number | undefined;
  if (
    ObjectUtils_keys(settings.planner.weeklyRangeSets).every(
      (k) => settings.planner.weeklyRangeSets[k]?.[1] === settings.planner.weeklyRangeSets.abs?.[1]
    )
  ) {
    allWeeklySetsMax = settings.planner.weeklyRangeSets.abs?.[1];
  }

  let allWeeklyFrequency: number | undefined;
  if (
    ObjectUtils_keys(settings.planner.weeklyFrequency).every(
      (k) => settings.planner.weeklyFrequency[k] === settings.planner.weeklyFrequency.abs
    )
  ) {
    allWeeklyFrequency = settings.planner.weeklyFrequency.abs;
  }

  const onUnits = useCallback(
    (newValue?: string) => {
      dispatch(
        lb<ISettings>()
          .p("units")
          .record(newValue as IUnit),
        "Update units"
      );
    },
    [dispatch]
  );

  const onSynergistMultiplier = useCallback(
    (e: IEither<string, Set<IValidationError>>) => {
      const v = parseAndClamp(e, 0, undefined, false);
      if (v != null) {
        dispatch(lb<ISettings>().p("planner").p("synergistMultiplier").record(v), "Update synergist");
      }
    },
    [dispatch]
  );

  const onRestTimer = useCallback(
    (e: IEither<string, Set<IValidationError>>) => {
      const v = parseAndClamp(e, 0);
      if (v != null) {
        dispatch(lb<ISettings>().p("timers").p("workout").record(v), "Update rest timer");
      }
    },
    [dispatch]
  );

  const onSetsSplitPreset = useCallback(
    (newValue?: string) => {
      if (newValue === "strength") {
        dispatch(
          [
            lb<ISettings>().p("planner").p("strengthSetsPct").record(70),
            lb<ISettings>().p("planner").p("hypertrophySetsPct").record(30),
          ],
          "Strength preset"
        );
      } else if (newValue === "hypertrophy") {
        dispatch(
          [
            lb<ISettings>().p("planner").p("strengthSetsPct").record(30),
            lb<ISettings>().p("planner").p("hypertrophySetsPct").record(70),
          ],
          "Hypertrophy preset"
        );
      }
    },
    [dispatch]
  );

  const onStrengthPct = useCallback(
    (e: IEither<string, Set<IValidationError>>) => {
      const v = parseAndClamp(e, 0, 100);
      if (v != null) {
        dispatch(lb<ISettings>().p("planner").p("strengthSetsPct").record(v), "Update strength %");
      }
    },
    [dispatch]
  );

  const onHypertrophyPct = useCallback(
    (e: IEither<string, Set<IValidationError>>) => {
      const v = parseAndClamp(e, 0, 100);
      if (v != null) {
        dispatch(lb<ISettings>().p("planner").p("hypertrophySetsPct").record(v), "Update hypertrophy %");
      }
    },
    [dispatch]
  );

  const onMuscleGroupsPreset = useCallback(
    (newValue?: string) => {
      const presets: Record<string, [[number, number], number]> = {
        novice: [[10, 12], 2],
        intermediate: [[13, 15], 3],
        advanced: [[16, 20], 4],
      };
      const preset = newValue && presets[newValue];
      if (preset) {
        const [range, freq] = preset;
        dispatch(
          [
            lb<ISettings>()
              .p("planner")
              .p("weeklyRangeSets")
              .record(ObjectUtils_fromArray(availableMuscleGroups.map((e) => [e, range]))),
            lb<ISettings>()
              .p("planner")
              .p("weeklyFrequency")
              .record(ObjectUtils_fromArray(availableMuscleGroups.map((e) => [e, freq]))),
          ],
          `${newValue} preset`
        );
      }
    },
    [dispatch, availableMuscleGroups]
  );

  const onChangeAllMin = useCallback(
    (e: IEither<string, Set<IValidationError>>) => {
      const v = parseAndClamp(e, 0);
      if (v != null) {
        const newValues = ObjectUtils_fromArray(
          availableMuscleGroups.map((mg) => [
            mg,
            [v, settings.planner.weeklyRangeSets[mg]?.[1] ?? 0] as [number, number],
          ])
        );
        dispatch(lb<ISettings>().p("planner").p("weeklyRangeSets").record(newValues), "Change all min");
      }
    },
    [dispatch, availableMuscleGroups, settings.planner.weeklyRangeSets]
  );

  const onChangeAllMax = useCallback(
    (e: IEither<string, Set<IValidationError>>) => {
      const v = parseAndClamp(e, 0);
      if (v != null) {
        const newValues = ObjectUtils_fromArray(
          availableMuscleGroups.map((mg) => [
            mg,
            [settings.planner.weeklyRangeSets[mg]?.[0] ?? 0, v] as [number, number],
          ])
        );
        dispatch(lb<ISettings>().p("planner").p("weeklyRangeSets").record(newValues), "Change all max");
      }
    },
    [dispatch, availableMuscleGroups, settings.planner.weeklyRangeSets]
  );

  const onChangeAllFreq = useCallback(
    (e: IEither<string, Set<IValidationError>>) => {
      const v = parseAndClamp(e, 0);
      if (v != null) {
        const newValues = ObjectUtils_fromArray(availableMuscleGroups.map((mg) => [mg, v]));
        dispatch(lb<ISettings>().p("planner").p("weeklyFrequency").record(newValues), "Change all freq");
      }
    },
    [dispatch, availableMuscleGroups]
  );

  return (
    <View className="pt-4 pb-6">
      <GroupHeader size="large" name="Muscle Settings" />
      <View className="mt-2" style={!props.inApp ? { minWidth: 512 } : undefined}>
        {!props.inApp && (
          <View className="mb-1">
            <View className="flex-row items-center">
              <Text className="mr-2">Units:</Text>
              <MenuItemValue
                name="Sets split preset"
                setPatternError={() => undefined}
                type="desktop-select"
                value={settings.units}
                values={[
                  ["lb", "lb"],
                  ["kg", "kg"],
                ]}
                onChange={onUnits}
              />
            </View>
          </View>
        )}
        <View className="flex-row mb-2" style={{ gap: props.inApp ? 4 : 16 }}>
          {!props.inApp && (
            <View className="flex-1">
              <Input
                label="Rest Timer"
                min={0}
                type="number"
                value={settings.timers.workout ?? 180}
                changeHandler={onRestTimer}
              />
            </View>
          )}
          <View className="flex-1">
            <Input
              label="Synergist multiplier"
              min={0}
              type="number"
              value={settings.planner.synergistMultiplier}
              changeHandler={onSynergistMultiplier}
            />
          </View>
        </View>
        <View className="mt-4 mb-1">
          <View className="flex-row items-center">
            <Text className="mr-2">Sets split preset:</Text>
            <MenuItemValue
              name="Sets split preset"
              setPatternError={() => undefined}
              type="desktop-select"
              value=""
              values={[
                ["", ""],
                ["strength", "Strength"],
                ["hypertrophy", "Hypertrophy"],
              ]}
              onChange={onSetsSplitPreset}
            />
          </View>
        </View>
        <View className="flex-row mb-2" style={{ gap: props.inApp ? 4 : 16 }}>
          <View className="flex-1">
            <Input
              label="Strength sets %"
              min={0}
              max={100}
              type="number"
              value={settings.planner.strengthSetsPct}
              changeHandler={onStrengthPct}
            />
          </View>
          <View className="flex-1">
            <Input
              label="Hypertrophy sets %"
              min={0}
              max={100}
              type="number"
              value={settings.planner.hypertrophySetsPct}
              changeHandler={onHypertrophyPct}
            />
          </View>
        </View>
        <Text className="mt-8 text-base font-bold">Weekly Sets Per Muscle Group</Text>
        <View className="mb-2">
          <LinkButton className="text-xs" name="planner-settings-muscle-groups" onPress={props.onShowEditMuscleGroups}>
            Edit Muscle Groups
          </LinkButton>
        </View>
        <View className="mb-1">
          <View className="flex-row items-center">
            <Text className="mr-2">Muscle Groups sets preset:</Text>
            <MenuItemValue
              name="Sets split preset"
              setPatternError={() => undefined}
              type="desktop-select"
              value=""
              values={[
                ["", ""],
                ["novice", "Novice"],
                ["intermediate", "Intermediate"],
                ["advanced", "Advanced"],
              ]}
              onChange={onMuscleGroupsPreset}
            />
          </View>
        </View>
        <View>
          <View className={`${!props.inApp ? "flex-row" : ""} items-start mb-2`}>
            <Text className="w-32 text-sm font-bold text-text-error">Change All</Text>
            <View className="flex-row flex-1 w-full gap-2">
              <View className="flex-1">
                <Input
                  label="Min"
                  min={0}
                  labelSize="xs"
                  type="number"
                  value={allWeeklySetsMin}
                  changeHandler={onChangeAllMin}
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Max"
                  min={0}
                  labelSize="xs"
                  type="number"
                  value={allWeeklySetsMax}
                  changeHandler={onChangeAllMax}
                />
              </View>
              <View style={{ flex: 1.5 }}>
                <Input
                  label="Freq, days"
                  labelSize="xs"
                  min={0}
                  type="number"
                  value={allWeeklyFrequency}
                  changeHandler={onChangeAllFreq}
                />
              </View>
            </View>
          </View>
          {availableMuscleGroups.map((muscleGroup) => {
            return (
              <MuscleGroupRow
                key={muscleGroup}
                muscleGroup={muscleGroup}
                muscleGroupName={Muscle_getMuscleGroupName(muscleGroup, settings)}
                min={settings.planner.weeklyRangeSets[muscleGroup]?.[0]}
                max={settings.planner.weeklyRangeSets[muscleGroup]?.[1]}
                freq={settings.planner.weeklyFrequency[muscleGroup]}
                inApp={props.inApp}
                dispatch={dispatch}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

interface IMuscleGroupRowProps {
  muscleGroup: IScreenMuscle;
  muscleGroupName: string;
  min: number | undefined;
  max: number | undefined;
  freq: number | undefined;
  inApp: boolean;
  dispatch: ILensDispatch<ISettings>;
}

const MuscleGroupRow = memo(function MuscleGroupRow(props: IMuscleGroupRowProps): JSX.Element {
  const { muscleGroup, dispatch } = props;

  const onMin = useCallback(
    (e: IEither<string, Set<IValidationError>>) => {
      const v = parseAndClamp(e, 0);
      if (v != null) {
        dispatch(
          lb<ISettings>().p("planner").p("weeklyRangeSets").p(muscleGroup).i(0).record(v),
          `Update ${muscleGroup} min`
        );
      }
    },
    [dispatch, muscleGroup]
  );

  const onMax = useCallback(
    (e: IEither<string, Set<IValidationError>>) => {
      const v = parseAndClamp(e, 0);
      if (v != null) {
        dispatch(
          lb<ISettings>().p("planner").p("weeklyRangeSets").p(muscleGroup).i(1).record(v),
          `Update ${muscleGroup} max`
        );
      }
    },
    [dispatch, muscleGroup]
  );

  const onFreq = useCallback(
    (e: IEither<string, Set<IValidationError>>) => {
      const v = parseAndClamp(e, 0);
      if (v != null) {
        dispatch(
          lb<ISettings>().p("planner").p("weeklyFrequency").p(muscleGroup).record(v),
          `Update ${muscleGroup} freq`
        );
      }
    },
    [dispatch, muscleGroup]
  );

  return (
    <View className={`${!props.inApp ? "flex-row" : ""} items-start mb-2`}>
      <Text className="w-32 text-xs font-bold">{props.muscleGroupName}</Text>
      <View className="flex-row flex-1 w-full gap-2">
        <View className="flex-1">
          <Input label="Min" min={0} type="number" labelSize="xs" value={props.min} changeHandler={onMin} />
        </View>
        <View className="flex-1">
          <Input label="Max" labelSize="xs" min={0} type="number" value={props.max} changeHandler={onMax} />
        </View>
        <View style={{ flex: 1.5 }}>
          <Input label="Freq, days" min={0} labelSize="xs" type="number" value={props.freq} changeHandler={onFreq} />
        </View>
      </View>
    </View>
  );
});

export function ModalPlannerSettings(props: IModalPlannerSettingsProps): JSX.Element {
  return (
    <Modal shouldShowClose={true} onClose={props.onClose}>
      <ModalPlannerSettingsContent {...props} />
    </Modal>
  );
}
