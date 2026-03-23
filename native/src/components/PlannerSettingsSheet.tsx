import React, { useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useStoreState } from "../context/StoreContext";
import { useDispatch } from "../context/DispatchContext";
import { lf } from "lens-shmens";
import { lb } from "lens-shmens";
import type { ISettings, IScreenMuscle } from "@shared/types";
import type { IState } from "@shared/models/state";
import { updateState } from "@shared/models/state";
import { ObjectUtils_keys, ObjectUtils_fromArray } from "@shared/utils/object";
import { Muscle_getAvailableMuscleGroups, Muscle_getMuscleGroupName } from "@shared/models/muscle";
import { GroupHeader } from "@crossplatform/components/GroupHeader";
import { LinkButton } from "@crossplatform/components/LinkButton";

function NumberField(props: {
  label: string;
  value: number | undefined;
  labelSize?: "xs" | "sm";
  onChangeValue: (v: number) => void;
}): React.ReactElement {
  const [text, setText] = useState(props.value?.toString() ?? "");
  return (
    <View className="flex-1">
      <Text className={`${props.labelSize === "xs" ? "text-xs" : "text-sm"} text-text-secondary mb-1`}>
        {props.label}
      </Text>
      <TextInput
        className="border border-border-neutral rounded px-2 py-1 text-text-primary bg-background-default"
        keyboardType="numeric"
        value={text}
        onChangeText={(t) => {
          setText(t);
          const n = parseInt(t, 10);
          if (!isNaN(n)) {
            props.onChangeValue(Math.max(0, n));
          }
        }}
        onBlur={() => {
          const n = parseInt(text, 10);
          if (isNaN(n)) {
            setText(props.value?.toString() ?? "");
          }
        }}
      />
    </View>
  );
}

function SelectField(props: {
  label: string;
  value: string;
  options: [string, string][];
  onSelect: (v: string) => void;
}): React.ReactElement {
  const [showOptions, setShowOptions] = useState(false);
  const selectedLabel = props.options.find(([v]) => v === props.value)?.[1] || props.value;
  return (
    <View>
      <Text className="text-sm text-text-secondary mb-1">{props.label}</Text>
      <Pressable
        className="border border-border-neutral rounded px-2 py-2 bg-background-default"
        onPress={() => setShowOptions(!showOptions)}
      >
        <Text className="text-text-primary">{selectedLabel || "Select..."}</Text>
      </Pressable>
      {showOptions && (
        <View className="border border-border-neutral rounded mt-1 bg-background-default">
          {props.options.map(([value, label]) => (
            <Pressable
              key={value}
              className="px-3 py-2 border-b border-border-neutral"
              onPress={() => {
                props.onSelect(value);
                setShowOptions(false);
              }}
            >
              <Text className={`${value === props.value ? "font-bold text-text-link" : "text-text-primary"}`}>
                {label || "(none)"}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export function PlannerSettingsSheet(): React.ReactElement {
  const state = useStoreState();
  const dispatch = useDispatch();
  const settings = state.storage.settings;

  function onNewSettings(newSettings: ISettings): void {
    updateState(dispatch, [lb<IState>().p("storage").p("settings").record(newSettings)], "Update planner settings");
  }

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

  return (
    <ScrollView className="flex-1 bg-background-default px-4 pt-2">
      <GroupHeader size="large" name="Muscle Settings" />

      <View className="mt-2 mb-2">
        <NumberField
          label="Synergist multiplier"
          value={settings.planner.synergistMultiplier}
          onChangeValue={(v) => onNewSettings(lf(settings).p("planner").p("synergistMultiplier").set(v))}
        />
      </View>

      <SelectField
        label="Sets split preset"
        value=""
        options={[
          ["", "(none)"],
          ["strength", "Strength"],
          ["hypertrophy", "Hypertrophy"],
        ]}
        onSelect={(v) => {
          if (v === "strength") {
            onNewSettings(
              lf(lf(settings).p("planner").p("strengthSetsPct").set(70)).p("planner").p("hypertrophySetsPct").set(30)
            );
          } else if (v === "hypertrophy") {
            onNewSettings(
              lf(lf(settings).p("planner").p("strengthSetsPct").set(30)).p("planner").p("hypertrophySetsPct").set(70)
            );
          }
        }}
      />

      <View className="flex-row gap-2 mt-2 mb-2">
        <NumberField
          label="Strength sets %"
          value={settings.planner.strengthSetsPct}
          onChangeValue={(v) => onNewSettings(lf(settings).p("planner").p("strengthSetsPct").set(Math.min(100, v)))}
        />
        <NumberField
          label="Hypertrophy sets %"
          value={settings.planner.hypertrophySetsPct}
          onChangeValue={(v) => onNewSettings(lf(settings).p("planner").p("hypertrophySetsPct").set(Math.min(100, v)))}
        />
      </View>

      <Text className="mt-6 text-base font-bold">Weekly Sets Per Muscle Group</Text>

      <View className="mt-2 mb-2">
        <SelectField
          label="Muscle Groups sets preset"
          value=""
          options={[
            ["", "(none)"],
            ["novice", "Novice"],
            ["intermediate", "Intermediate"],
            ["advanced", "Advanced"],
          ]}
          onSelect={(v) => {
            const ranges = v === "novice" ? [10, 12] : v === "intermediate" ? [13, 15] : [16, 20];
            const freq = v === "novice" ? 2 : v === "intermediate" ? 3 : 4;
            if (v) {
              let ns = lf(settings)
                .p("planner")
                .p("weeklyRangeSets")
                .set(ObjectUtils_fromArray(availableMuscleGroups.map((e) => [e, ranges as [number, number]])));
              ns = lf(ns)
                .p("planner")
                .p("weeklyFrequency")
                .set(ObjectUtils_fromArray(availableMuscleGroups.map((e) => [e, freq])));
              onNewSettings(ns);
            }
          }}
        />
      </View>

      <MuscleRow
        label="Change All"
        labelClassName="font-bold text-red-700"
        min={allWeeklySetsMin}
        max={allWeeklySetsMax}
        frequency={allWeeklyFrequency}
        onChangeMin={(v) => {
          const nv = ObjectUtils_fromArray(
            availableMuscleGroups.map((mg) => [
              mg,
              [v, settings.planner.weeklyRangeSets[mg]?.[1] ?? 0] as [number, number],
            ])
          );
          onNewSettings(lf(settings).p("planner").p("weeklyRangeSets").set(nv));
        }}
        onChangeMax={(v) => {
          const nv = ObjectUtils_fromArray(
            availableMuscleGroups.map((mg) => [
              mg,
              [settings.planner.weeklyRangeSets[mg]?.[0] ?? 0, v] as [number, number],
            ])
          );
          onNewSettings(lf(settings).p("planner").p("weeklyRangeSets").set(nv));
        }}
        onChangeFrequency={(v) => {
          const nv = ObjectUtils_fromArray(availableMuscleGroups.map((mg) => [mg, v]));
          onNewSettings(lf(settings).p("planner").p("weeklyFrequency").set(nv));
        }}
      />

      {availableMuscleGroups.map((muscleGroup) => (
        <MuscleRow
          key={muscleGroup}
          label={Muscle_getMuscleGroupName(muscleGroup, settings)}
          min={settings.planner.weeklyRangeSets[muscleGroup]?.[0]}
          max={settings.planner.weeklyRangeSets[muscleGroup]?.[1]}
          frequency={settings.planner.weeklyFrequency[muscleGroup]}
          onChangeMin={(v) =>
            onNewSettings(
              lf(settings)
                .p("planner")
                .p("weeklyRangeSets")
                .p(muscleGroup as IScreenMuscle)
                .i(0)
                .set(v)
            )
          }
          onChangeMax={(v) =>
            onNewSettings(
              lf(settings)
                .p("planner")
                .p("weeklyRangeSets")
                .p(muscleGroup as IScreenMuscle)
                .i(1)
                .set(v)
            )
          }
          onChangeFrequency={(v) =>
            onNewSettings(
              lf(settings)
                .p("planner")
                .p("weeklyFrequency")
                .p(muscleGroup as IScreenMuscle)
                .set(v)
            )
          }
        />
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function MuscleRow(props: {
  label: string;
  labelClassName?: string;
  min: number | undefined;
  max: number | undefined;
  frequency: number | undefined;
  onChangeMin: (v: number) => void;
  onChangeMax: (v: number) => void;
  onChangeFrequency: (v: number) => void;
}): React.ReactElement {
  return (
    <View className="mb-2">
      <Text className={`text-xs font-bold mb-1 ${props.labelClassName || ""}`}>{props.label}</Text>
      <View className="flex-row gap-2">
        <NumberField label="Min" labelSize="xs" value={props.min} onChangeValue={props.onChangeMin} />
        <NumberField label="Max" labelSize="xs" value={props.max} onChangeValue={props.onChangeMax} />
        <NumberField
          label="Freq, days"
          labelSize="xs"
          value={props.frequency}
          onChangeValue={props.onChangeFrequency}
        />
      </View>
    </View>
  );
}
