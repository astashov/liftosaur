import { JSX, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import Animated, { SlideInLeft, SlideInRight } from "react-native-reanimated";
import { Text } from "../primitives/text";
import { DraggableList2 } from "../draggableList2";
import { Button } from "../button";
import { IconHandle } from "../icons/iconHandle";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { LiftographPalette_entry } from "../../liftograph/liftographPalette";
import { ILiftographModelSeries, ILiftographWidgetModel } from "../../liftograph/liftographWidgetModel";
import {
  LiftographWidgetEdit_addSeries,
  LiftographWidgetEdit_moveSeries,
  LiftographWidgetEdit_newSeries,
  LiftographWidgetEdit_removeSeries,
  LiftographWidgetEdit_seriesIndices,
  LiftographWidgetEdit_setSeries,
} from "../../liftograph/liftographWidgetEdit";
import {
  DashboardWidgetFields_groupsFromText,
  DashboardWidgetFields_seriesSummary,
} from "../../models/dashboardWidgetFields";
import { DashboardFormChevron, DashboardFormChips, DashboardFormField, DashboardFormInput } from "./dashboardFormParts";
import { DashboardSeriesForm } from "./dashboardSeriesForm";
import { IDashboardFormOptions } from "./dashboardSourceFields";

const RANGES = ["4w", "3m", "6m", "1y", "all"];

export interface IDashboardWidgetFormProps {
  model: ILiftographWidgetModel;
  options: IDashboardFormOptions;
  onChange: (model: ILiftographWidgetModel) => void;
  onPickExercise: (entryIndex: number) => void;
  onEditAsText: () => void;
  onNavigate?: () => void;
}

function RangeField(props: { value: string | undefined; onChange: (value: string | undefined) => void }): JSX.Element {
  return (
    <DashboardFormField label="Range">
      <View className="gap-2">
        <DashboardFormChips
          testID="dashboard-widget-range"
          options={RANGES.map((range) => ({ value: range, label: range }))}
          selected={props.value}
          onSelect={props.onChange}
        />
        <DashboardFormInput
          testID="dashboard-widget-range-input"
          value={props.value}
          placeholder="Like 8w"
          onChange={props.onChange}
        />
      </View>
    </DashboardFormField>
  );
}

function SeriesList(props: {
  model: ILiftographWidgetModel;
  onChange: (model: ILiftographWidgetModel) => void;
  onOpen: (entryIndex: number) => void;
}): JSX.Element {
  const { model } = props;
  const indices = LiftographWidgetEdit_seriesIndices(model);
  const entries = model.kind === "graph" ? model.entries : [];
  return (
    <DashboardFormField label="Series">
      <DraggableList2
        items={indices}
        onDragEnd={(from, to) => props.onChange(LiftographWidgetEdit_moveSeries(model, from, to))}
        element={(entryIndex, listIndex, handle) => {
          const entry = entries[entryIndex];
          const series = entry?.type === "series" ? entry.series : undefined;
          return (
            <View className="flex-row items-center border-b border-border-neutral bg-background-default">
              {handle(
                <View className="p-2">
                  <IconHandle />
                </View>
              )}
              <Pressable
                testID={`dashboard-widget-series-${entryIndex}`}
                data-testid={`dashboard-widget-series-${entryIndex}`}
                className="flex-row items-center flex-1 gap-3 py-3 pl-1 pr-2 rounded-lg"
                style={({ pressed }) => ({
                  backgroundColor: pressed ? Tailwind_semantic().background.subtle : "transparent",
                })}
                onPress={() => props.onOpen(entryIndex)}
              >
                <View
                  className="w-3 h-3"
                  style={{
                    borderRadius: 999,
                    backgroundColor: LiftographPalette_entry(series?.color, listIndex).stroke,
                  }}
                />
                <View className="flex-1">
                  <Text className="text-base font-semibold" numberOfLines={1}>
                    {series?.name ?? "Untitled series"}
                  </Text>
                  <Text className="text-xs text-text-secondary" numberOfLines={1}>
                    {series != null ? DashboardWidgetFields_seriesSummary(series) : ""}
                  </Text>
                </View>
                <DashboardFormChevron direction="forward" />
              </Pressable>
            </View>
          );
        }}
      />
      <Pressable
        testID="dashboard-widget-add-series"
        data-testid="dashboard-widget-add-series"
        className="py-3"
        onPress={() => {
          const next = LiftographWidgetEdit_addSeries(model, LiftographWidgetEdit_newSeries());
          props.onChange(next);
          props.onOpen(next.kind === "graph" ? next.entries.length - 1 : 0);
        }}
      >
        <Text className="text-base text-text-link">+ Add series</Text>
      </Pressable>
    </DashboardFormField>
  );
}

const SLIDE_MS = 250;
const isNative = Platform.OS !== "web";
const SlideForward = isNative ? SlideInRight.duration(SLIDE_MS) : undefined;
const SlideBack = isNative ? SlideInLeft.duration(SLIDE_MS) : undefined;

function GraphForm(props: IDashboardWidgetFormProps): JSX.Element {
  const { model } = props;
  const [view, setView] = useState<{ openEntry?: number; hasMoved: boolean }>({ hasMoved: false });
  const openEntry = view.openEntry;
  const open = (entryIndex: number | undefined): void => {
    setView({ openEntry: entryIndex, hasMoved: true });
    props.onNavigate?.();
  };
  if (model.kind !== "graph") {
    return <></>;
  }
  const entry = openEntry != null ? model.entries[openEntry] : undefined;
  if (openEntry != null && entry?.type === "series") {
    return (
      <Animated.View key={`series-${openEntry}`} entering={SlideForward}>
        <Pressable testID="dashboard-widget-series-back" className="py-2" onPress={() => open(undefined)}>
          <View className="flex-row items-center gap-2">
            <DashboardFormChevron direction="back" color={Tailwind_semantic().text.link} />
            <Text className="text-base text-text-link">All series</Text>
          </View>
        </Pressable>
        <DashboardSeriesForm
          key={openEntry}
          options={props.options}
          series={entry.series}
          isValue={false}
          onChange={(series: ILiftographModelSeries) =>
            props.onChange(LiftographWidgetEdit_setSeries(model, openEntry, series))
          }
          onPickExercise={() => props.onPickExercise(openEntry)}
          onEditAsText={props.onEditAsText}
        />
        <View className="pt-4">
          <Button
            name="dashboard-widget-series-delete"
            testID="dashboard-widget-series-delete"
            kind="red"
            buttonSize="md"
            className="w-full"
            onClick={() => {
              props.onChange(LiftographWidgetEdit_removeSeries(model, openEntry));
              open(undefined);
            }}
          >
            Delete series
          </Button>
        </View>
      </Animated.View>
    );
  }
  return (
    <Animated.View key="list" entering={view.hasMoved ? SlideBack : undefined}>
      <RangeField value={model.range} onChange={(range) => props.onChange({ ...model, range })} />
      <SeriesList model={model} onChange={props.onChange} onOpen={open} />
    </Animated.View>
  );
}

function MusclesForm(props: IDashboardWidgetFormProps): JSX.Element {
  const { model } = props;
  if (model.kind !== "muscles") {
    return <></>;
  }
  const show = model.show ?? { type: "show", map: true, sets: true };
  return (
    <View>
      <RangeField value={model.range} onChange={(range) => props.onChange({ ...model, range })} />
      <DashboardFormField label="Show">
        {show.type === "raw" ? (
          <Text className="font-mono text-sm">{show.text}</Text>
        ) : (
          <View className="gap-2">
            <DashboardFormChips
              testID="dashboard-widget-show"
              options={[
                { value: "both", label: "Map and sets" },
                { value: "map", label: "Map" },
                { value: "sets", label: "Sets" },
              ]}
              selected={show.map && show.sets ? "both" : show.map ? "map" : "sets"}
              onSelect={(part) =>
                props.onChange({
                  ...model,
                  show: { ...show, map: part !== "sets", sets: part !== "map" },
                })
              }
            />
            {show.sets ? (
              <DashboardFormInput
                testID="dashboard-widget-show-groups"
                value={show.groups?.join(", ")}
                placeholder="Muscle groups, like chest, back"
                onChange={(text) =>
                  props.onChange({ ...model, show: { ...show, groups: DashboardWidgetFields_groupsFromText(text) } })
                }
              />
            ) : null}
          </View>
        )}
      </DashboardFormField>
    </View>
  );
}

export function DashboardWidgetForm(props: IDashboardWidgetFormProps): JSX.Element {
  const { model } = props;
  switch (model.kind) {
    case "graph":
      return <GraphForm {...props} />;
    case "value":
      return (
        <View>
          <DashboardSeriesForm
            series={model.series}
            options={props.options}
            isValue={true}
            onChange={(series) => props.onChange({ ...model, series })}
            onPickExercise={() => props.onPickExercise(0)}
            onEditAsText={props.onEditAsText}
          />
          <DashboardFormField label="Compare with">
            <DashboardFormInput
              testID="dashboard-widget-compare"
              value={model.compare}
              placeholder="Like 4w"
              onChange={(compare) => props.onChange({ ...model, compare })}
            />
          </DashboardFormField>
          <DashboardFormField label="Trend">
            <DashboardFormInput
              testID="dashboard-widget-trend"
              value={model.trend}
              placeholder="Like 3m"
              onChange={(trend) => props.onChange({ ...model, trend })}
            />
          </DashboardFormField>
        </View>
      );
    case "muscles":
      return <MusclesForm {...props} />;
    case "calendar":
      return <RangeField value={model.range} onChange={(range) => props.onChange({ ...model, range })} />;
  }
}
