import { JSX } from "react";
import { Pressable, View } from "react-native";
import { Text } from "../primitives/text";
import { ExerciseImage } from "../exerciseImage";
import { ISettings } from "../../types";
import { LiftographRows_statsKeys } from "../../liftograph/liftographRows";
import { ILiftographModelSeries, ILiftographModelSource } from "../../liftograph/liftographWidgetModel";
import {
  ILiftographSourceKind,
  LiftographWidgetEdit_chooseSource,
  LiftographWidgetEdit_setSource,
} from "../../liftograph/liftographWidgetEdit";
import {
  DashboardWidgetFields_dayFromText,
  DashboardWidgetFields_dayText,
  DashboardWidgetFields_exerciseType,
} from "../../models/dashboardWidgetFields";
import {
  DashboardFormChevron,
  DashboardFormChips,
  DashboardFormChoice,
  DashboardFormField,
  DashboardFormInput,
  DashboardFormRaw,
  DashboardFormSubField,
} from "./dashboardFormParts";

const STATS_KEYS: string[] = [...LiftographRows_statsKeys];

export interface IDashboardFormOptions {
  settings: ISettings;
  programNames: string[];
  labelsByExercise: Partial<Record<string, string[]>>;
}

function ExerciseRow(props: {
  source: Extract<ILiftographModelSource, { type: "exercise" }>;
  settings: ISettings;
  onPress: () => void;
}): JSX.Element {
  const exerciseType = DashboardWidgetFields_exerciseType(props.source, props.settings.exercises);
  return (
    <Pressable
      testID="dashboard-series-exercise"
      data-testid="dashboard-series-exercise"
      className="flex-row items-center gap-3 px-3 py-2 border rounded-lg border-border-neutral"
      onPress={props.onPress}
    >
      {exerciseType != null ? (
        <ExerciseImage settings={props.settings} className="w-10" exerciseType={exerciseType} size="small" />
      ) : null}
      <View className="flex-1">
        <Text className="text-base font-semibold">{props.source.name ?? "Pick an exercise"}</Text>
        {props.source.equipment != null ? (
          <Text className="text-xs text-text-secondary">{props.source.equipment}</Text>
        ) : null}
      </View>
      <DashboardFormChevron direction="forward" />
    </Pressable>
  );
}

function FilterPills(props: {
  label: string;
  testID: string;
  options: string[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}): JSX.Element | null {
  if (props.options.length === 0 && props.value == null) {
    return null;
  }
  return (
    <DashboardFormField label={props.label}>
      <DashboardFormChoice
        testID={props.testID}
        title={props.label}
        options={props.options}
        value={props.value}
        anyLabel="Any"
        onChange={props.onChange}
      />
    </DashboardFormField>
  );
}

export function DashboardSourceFields(props: {
  series: ILiftographModelSeries;
  options: IDashboardFormOptions;
  onChange: (series: ILiftographModelSeries) => void;
  onPickExercise: () => void;
  onEditAsText: () => void;
}): JSX.Element {
  const { series, options } = props;
  const source = series.source;
  const setSource = (next: ILiftographModelSource): void =>
    props.onChange(LiftographWidgetEdit_setSource(series, next));
  if (source?.type === "raw") {
    return (
      <DashboardFormField label="Source">
        <DashboardFormRaw text={source.text} onEditAsText={props.onEditAsText} />
      </DashboardFormField>
    );
  }
  const exerciseType =
    source?.type === "exercise" ? DashboardWidgetFields_exerciseType(source, options.settings.exercises) : undefined;
  const labels = exerciseType != null ? (options.labelsByExercise[exerciseType.id] ?? []) : [];
  return (
    <View>
      <DashboardFormField label="Source">
        <View className="gap-2">
          <DashboardFormChips<ILiftographSourceKind | undefined>
            testID="dashboard-series-source"
            options={[
              { value: "exercise", label: "Exercise" },
              { value: "workout", label: "Workouts" },
              { value: "stats", label: "Body stat" },
            ]}
            selected={source?.type}
            onSelect={(kind) => {
              if (kind == null) {
                return;
              }
              const choice = LiftographWidgetEdit_chooseSource(series, kind);
              if (choice.type === "pickExercise") {
                props.onPickExercise();
              } else if (choice.type === "set") {
                props.onChange(choice.series);
              }
            }}
          />
          {source?.type === "exercise" ? (
            <ExerciseRow source={source} settings={options.settings} onPress={props.onPickExercise} />
          ) : null}
          {source?.type === "stats" ? (
            <DashboardFormSubField label="Body stat">
              <DashboardFormChoice
                testID="dashboard-series-stat"
                title="Body stat"
                options={STATS_KEYS}
                value={source.key}
                onChange={(key) => setSource({ type: "stats", key: key ?? source.key })}
              />
            </DashboardFormSubField>
          ) : null}
        </View>
      </DashboardFormField>
      {source?.type === "exercise" ? (
        <FilterPills
          label="Label"
          testID="dashboard-series-label"
          options={labels}
          value={source.label}
          onChange={(label) => setSource({ ...source, label })}
        />
      ) : null}
      {source?.type === "exercise" || source?.type === "workout" ? (
        <>
          <FilterPills
            label="Program"
            testID="dashboard-series-program"
            options={options.programNames}
            value={source.program}
            onChange={(program) => setSource({ ...source, program })}
          />
          <DashboardFormField label="Day" hint="A day number like 2, or a day name. Empty means any day.">
            <DashboardFormInput
              testID="dashboard-series-day"
              value={DashboardWidgetFields_dayText(source.day)}
              placeholder="Any day"
              onChange={(text) => setSource({ ...source, day: DashboardWidgetFields_dayFromText(text ?? "") })}
            />
          </DashboardFormField>
        </>
      ) : null}
    </View>
  );
}
