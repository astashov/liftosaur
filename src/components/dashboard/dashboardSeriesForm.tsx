import { JSX } from "react";
import { View } from "react-native";
import {
  ILiftographAgg,
  LiftographCompile_aggs,
  LiftographCompile_smoothAggs,
} from "../../liftograph/liftographCompile";
import { liftographPresets } from "../../liftograph/liftographPresets";
import {
  ILiftographModelAgg,
  ILiftographModelAggField,
  ILiftographModelSeries,
  LiftographWidgetModel_aggHint,
  LiftographWidgetModel_isNumeric,
  LiftographWidgetModel_presetLabel,
  LiftographWidgetModel_presetsFor,
  LiftographWidgetModel_windows,
  LiftographWidgetModel_withAgg,
} from "../../liftograph/liftographWidgetModel";
import {
  DashboardFormChips,
  DashboardFormColors,
  DashboardFormField,
  DashboardFormInput,
  DashboardFormRaw,
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
const DEFAULT_WINDOWS: Record<ILiftographModelAggField, string> = { group: "1w", smooth: "5" };

function ValuesFields(props: {
  series: ILiftographModelSeries;
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
  const presets = LiftographWidgetModel_presetsFor(series.source);
  const selected = values?.preset ?? presets[0];
  const preset = selected != null ? liftographPresets[selected] : undefined;
  return (
    <DashboardFormField label="What to plot">
      <View className="gap-2">
        <DashboardFormChips
          testID="dashboard-series-preset"
          options={presets.map((name) => ({ value: name, label: LiftographWidgetModel_presetLabel(name) }))}
          selected={selected}
          onSelect={(name) => props.onChange({ ...series, values: { type: "preset", preset: name } })}
        />
        {preset?.hasArg ? (
          <DashboardFormInput
            testID="dashboard-series-muscle"
            value={values?.arg}
            placeholder="Muscle group, like chest"
            onChange={(arg) => props.onChange({ ...series, values: { type: "preset", preset: preset.name, arg } })}
          />
        ) : null}
      </View>
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
    <DashboardFormField label={props.label} hint={LiftographWidgetModel_aggHint(field, value)}>
      <View className="gap-2">
        <DashboardFormChips<ILiftographAgg | undefined>
          testID={testID}
          options={[
            { value: undefined, label: "None" },
            ...props.aggs.map((agg) => ({ value: agg, label: AGG_LABELS[agg] })),
          ]}
          selected={value?.agg}
          onSelect={(agg) => props.onChange(LiftographWidgetModel_withAgg(value, agg, DEFAULT_WINDOWS[field]))}
        />
        {value != null ? (
          <DashboardFormChips<string | undefined>
            testID={`${testID}-window`}
            options={LiftographWidgetModel_windows(field, value.window).map((window) => ({
              value: window,
              label: window,
            }))}
            selected={value.window}
            onSelect={(window) =>
              props.onChange({ type: "agg", agg: value.agg, ...(window != null ? { window } : {}) })
            }
          />
        ) : null}
      </View>
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
  const isNumeric = LiftographWidgetModel_isNumeric(series);
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
      <ValuesFields series={series} onChange={onChange} onEditAsText={props.onEditAsText} />
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
