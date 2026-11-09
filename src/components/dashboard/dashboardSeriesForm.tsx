import { JSX } from "react";
import { View } from "react-native";
import {
  ILiftographAgg,
  LiftographCompile_aggs,
  LiftographCompile_smoothAggs,
} from "../../liftograph/liftographCompile";
import { liftographPresets } from "../../liftograph/liftographPresets";
import { ILiftographModelAgg, ILiftographModelSeries } from "../../liftograph/liftographWidgetModel";
import {
  ILiftographModelAggField,
  LiftographWidgetEdit_presetsFor,
  LiftographWidgetEdit_withAgg,
  LiftographWidgetEdit_withPreset,
} from "../../liftograph/liftographWidgetEdit";
import {
  DashboardWidgetFields_aggHint,
  DashboardWidgetFields_isNumeric,
  DashboardWidgetFields_muscleGroupLabel,
  DashboardWidgetFields_muscleGroups,
  DashboardWidgetFields_presetLabel,
  DashboardWidgetFields_windows,
} from "../../models/dashboardWidgetFields";
import { ISettings } from "../../types";
import {
  DashboardFormChoice,
  DashboardFormChips,
  DashboardFormColors,
  DashboardFormField,
  DashboardFormInput,
  DashboardFormPresetInput,
  DashboardFormRaw,
  DashboardFormSubField,
} from "./dashboardFormParts";
import { DashboardSourceFields, IDashboardFormOptions } from "./dashboardSourceFields";

const AGG_LABELS: Record<ILiftographAgg, string> = {
  max: "Max",
  min: "Min",
  sum: "Sum",
  avg: "Average",
  last: "Last",
  count: "Count",
};

function ValuesFields(props: {
  series: ILiftographModelSeries;
  settings: ISettings;
  onChange: (series: ILiftographModelSeries) => void;
  onEditAsText: () => void;
}): JSX.Element {
  const { series } = props;
  const values = series.values;
  if (values?.type === "raw" || values?.type === "script") {
    return (
      <DashboardFormField label={values.type === "script" ? "Custom script" : "What to plot"}>
        <DashboardFormRaw text={values.text.trim()} onEditAsText={props.onEditAsText} />
      </DashboardFormField>
    );
  }
  const presets = LiftographWidgetEdit_presetsFor(series.source);
  const selected = values?.preset ?? presets[0];
  const preset = selected != null ? liftographPresets[selected] : undefined;
  return (
    <DashboardFormField label="What to plot">
      <DashboardFormChips
        testID="dashboard-series-preset"
        options={presets.map((name) => ({ value: name, label: DashboardWidgetFields_presetLabel(name) }))}
        selected={selected}
        onSelect={(name) => props.onChange({ ...series, values: LiftographWidgetEdit_withPreset(values, name) })}
      />
      {preset?.hasArg ? (
        <DashboardFormSubField label="Muscle group">
          <DashboardFormChoice
            testID="dashboard-series-muscle"
            title="Muscle group"
            options={DashboardWidgetFields_muscleGroups(props.settings, true)}
            value={values?.arg}
            labelOf={(group) => DashboardWidgetFields_muscleGroupLabel(group, props.settings)}
            onChange={(arg) => props.onChange({ ...series, values: { type: "preset", preset: preset.name, arg } })}
          />
        </DashboardFormSubField>
      ) : null}
    </DashboardFormField>
  );
}

function AggField(props: {
  field: ILiftographModelAggField;
  label: string;
  aggs: readonly ILiftographAgg[];
  value: ILiftographModelAgg | undefined;
  isNumeric: boolean;
  onChange: (value: ILiftographModelAgg | undefined) => void;
  onEditAsText: () => void;
}): JSX.Element | null {
  const { value, field } = props;
  const testID = `dashboard-series-${field}`;
  if (value?.type === "raw" || (props.isNumeric && value != null)) {
    return (
      <DashboardFormField label={props.label}>
        <DashboardFormRaw
          text={value.type === "raw" ? value.text : `${value.agg}${value.window != null ? `(${value.window})` : ""}`}
          onEditAsText={props.onEditAsText}
        />
      </DashboardFormField>
    );
  }
  if (props.isNumeric) {
    return null;
  }
  return (
    <DashboardFormField label={props.label} hint={DashboardWidgetFields_aggHint(field, value)}>
      <DashboardFormChips<ILiftographAgg | undefined>
        testID={testID}
        options={[
          { value: undefined, label: "None" },
          ...props.aggs.map((agg) => ({ value: agg, label: AGG_LABELS[agg] })),
        ]}
        selected={value?.agg}
        onSelect={(agg) => props.onChange(LiftographWidgetEdit_withAgg(value, agg, field))}
      />
      {value != null ? (
        <DashboardFormSubField label={field === "group" ? "Period" : "Over the last"}>
          <DashboardFormPresetInput
            testID={`${testID}-window`}
            options={DashboardWidgetFields_windows(field)}
            value={value.window}
            placeholder={field === "group" ? "Like 6w" : "Points like 7, or days like 14d"}
            onChange={(window) =>
              props.onChange({ type: "agg", agg: value.agg, ...(window != null ? { window } : {}) })
            }
          />
        </DashboardFormSubField>
      ) : null}
    </DashboardFormField>
  );
}

export function DashboardSeriesForm(props: {
  series: ILiftographModelSeries;
  isValue: boolean;
  options: IDashboardFormOptions;
  onChange: (series: ILiftographModelSeries) => void;
  onPickExercise: () => void;
  onEditAsText: () => void;
}): JSX.Element {
  const { series, onChange } = props;
  const isNumeric = DashboardWidgetFields_isNumeric(series);
  return (
    <View>
      <DashboardFormField label="Name">
        <DashboardFormInput
          testID="dashboard-series-name"
          value={series.name}
          placeholder="Series name"
          onChange={(name) => onChange({ ...series, name })}
        />
      </DashboardFormField>
      <DashboardSourceFields
        series={series}
        options={props.options}
        onChange={onChange}
        onPickExercise={props.onPickExercise}
        onEditAsText={props.onEditAsText}
      />
      <ValuesFields
        series={series}
        settings={props.options.settings}
        onChange={onChange}
        onEditAsText={props.onEditAsText}
      />
      <AggField
        field="group"
        label="Group"
        aggs={LiftographCompile_aggs}
        value={series.group}
        isNumeric={isNumeric}
        onChange={(group) => onChange({ ...series, group })}
        onEditAsText={props.onEditAsText}
      />
      <AggField
        field="smooth"
        label="Smooth"
        aggs={LiftographCompile_smoothAggs}
        value={series.smooth}
        isNumeric={isNumeric}
        onChange={(smooth) => onChange({ ...series, smooth })}
        onEditAsText={props.onEditAsText}
      />
      {!props.isValue ? (
        <>
          <DashboardFormField label="Mark">
            <DashboardFormChips<ILiftographModelSeries["mark"]>
              testID="dashboard-series-mark"
              options={[
                { value: undefined, label: "Auto" },
                { value: "line", label: "Line" },
                { value: "bars", label: "Bars" },
                { value: "dots", label: "Dots" },
              ]}
              selected={series.mark}
              onSelect={(mark) => onChange({ ...series, mark })}
            />
          </DashboardFormField>
          <DashboardFormField label="Axis">
            <DashboardFormChips<ILiftographModelSeries["axis"]>
              testID="dashboard-series-axis"
              options={[
                { value: undefined, label: "Auto" },
                { value: "left", label: "Left" },
                { value: "right", label: "Right" },
              ]}
              selected={series.axis}
              onSelect={(axis) => onChange({ ...series, axis })}
            />
          </DashboardFormField>
          <DashboardFormField label="Color">
            <DashboardFormColors
              testID="dashboard-series-color"
              value={series.color}
              onChange={(color) => onChange({ ...series, color })}
            />
          </DashboardFormField>
        </>
      ) : null}
    </View>
  );
}
