import { JSX, memo, useCallback, useMemo, useState } from "react";
import { usePerfWhyRender } from "../utils/usePerfWhyRender";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { Select } from "./primitives/select";
import { CollectionUtils_inGroupsOf } from "../utils/collection";
import { DateUtils_format } from "../utils/date";
import { equipmentName, Exercise_eq, Exercise_get } from "../models/exercise";
import { Weight_isOrPct, Weight_display } from "../models/weight";
import { IHistoryRecord, IExerciseType, ISettings, IExerciseSelectedType } from "../types";
import { IDispatch } from "../ducks/types";
import { ObjectUtils_keys } from "../utils/object";
import { ILiftographExerciseGraphData, LiftographGraphs_exerciseData } from "../liftograph/liftographGraphs";
import { ILiftographSeriesEval } from "../liftograph/liftographSeriesEval";
import { useTimedMemo } from "../utils/useTimedMemo";
import { Tailwind_colors } from "../utils/tailwindConfig";
import { Thunk_editHistoryRecord } from "../ducks/thunks";
import { LineChart, ILineChartSeries } from "./lineChart";
import { GraphLegendOverlay, useGraphActiveCursor } from "./graphLegendOverlay";

interface IGraphProps {
  id?: string;
  evaluation: ILiftographSeriesEval;
  isWithOneRm?: boolean;
  isWithProgramLines?: boolean;
  exercise: IExerciseType;
  settings: ISettings;
  title?: string;
  subtitle?: string;
  isSameXAxis?: boolean;
  minX: number;
  maxX: number;
  isWithBodyweight?: boolean;
  initialType?: IExerciseSelectedType;
  dispatch?: IDispatch;
  isInteractive?: boolean;
  onInteract?: (reason: "manipulate" | "type") => void;
}

function GraphExerciseInner(props: IGraphProps): JSX.Element {
  usePerfWhyRender("graph", props as unknown as Record<string, unknown>);
  const [selectedType, setSelectedType] = useState<IExerciseSelectedType>(props.initialType || "weight");
  const eqName = equipmentName(props.exercise.equipment);
  const units = props.settings.units;
  const exercise = Exercise_get(props.exercise, props.settings.exercises);

  const result = useTimedMemo(
    "graphExercise.data",
    () =>
      LiftographGraphs_exerciseData(
        props.evaluation,
        props.exercise,
        selectedType,
        !!props.isWithOneRm,
        !!props.isWithBodyweight
      ),
    [props.evaluation, props.exercise, selectedType, props.isWithOneRm, props.isWithBodyweight]
  );

  const series: ILineChartSeries[] = useMemo(
    () => [
      {
        label: "Weight",
        show: selectedType === "weight",
        color: Tailwind_colors().red[500],
        width: 1.5,
      },
      {
        label: "Reps",
        show: false,
        color: Tailwind_colors().yellow[500],
        width: 1,
      },
      {
        label: "e1RM",
        show: Boolean(props.isWithOneRm) && selectedType === "weight",
        color: Tailwind_colors().blue[500],
        width: 1.5,
      },
      {
        label: "Volume",
        show: selectedType === "volume",
        color: Tailwind_colors().red[500],
        width: 1.5,
      },
      {
        label: "Bodyweight",
        show: true,
        color: Tailwind_colors().green[500],
        width: 1,
      },
    ],
    [selectedType, props.isWithOneRm]
  );

  const yearSec = 365 * 24 * 60 * 60;
  const xMin = props.isSameXAxis ? Math.max(props.minX, props.maxX - yearSec) : undefined;
  const xMax = props.isSameXAxis ? props.maxX : undefined;

  const { cursorIdx, chartRef, handleCursorChange, onCloseOverlay, overlayVisible } = useGraphActiveCursor(props.id);

  const propsOnInteract = props.onInteract;
  const onChartInteract = useCallback(() => propsOnInteract?.("manipulate"), [propsOnInteract]);

  const timestamps = result.data[0];
  const cursorTimestamp = cursorIdx != null ? timestamps[cursorIdx] : null;
  const cursorRecord = cursorTimestamp != null ? result.historyRecords[cursorTimestamp] : undefined;

  return (
    <View className="relative" testID="graph" data-testid="graph">
      <View testID="graph-data" data-testid="graph-data">
        <View className="flex-row items-center mb-1">
          <View className="flex-1">
            <View>
              <Text className="text-lg font-semibold leading-scaled-6 text-left u-title">
                {props.title || exercise.name}
              </Text>
            </View>
            <View>
              <Text className="text-xs leading-scaled-4 text-left text-text-secondary">{props.subtitle || eqName}</Text>
            </View>
          </View>
          <View>
            <Select
              value={selectedType}
              onChange={(v) => {
                props.onInteract?.("type");
                setSelectedType(v as IExerciseSelectedType);
              }}
              options={[
                { value: "weight", label: "Max Weight" },
                { value: "volume", label: "Volume" },
              ]}
              className="p-2 text-xs text-right bg-background-default"
            />
          </View>
        </View>
        <View className="relative">
          <LineChart
            ref={chartRef}
            data={result.data}
            series={series}
            height={320}
            xMin={xMin}
            xMax={xMax}
            programLines={props.isWithProgramLines ? result.changeProgramTimes : undefined}
            onCursorChange={handleCursorChange}
            onInteract={onChartInteract}
            yAxisFormatter={(v) => `${Math.round(v)}`}
            isInteractive={props.isInteractive}
          />
          <GraphLegendOverlay visible={overlayVisible} onClose={onCloseOverlay}>
            <GraphExerciseLegend
              cursorIdx={cursorIdx}
              data={result.data}
              units={units}
              selectedType={selectedType}
              isWithOneRm={props.isWithOneRm}
              record={cursorRecord}
              exercise={props.exercise}
              dispatch={props.dispatch}
            />
          </GraphLegendOverlay>
        </View>
      </View>
    </View>
  );
}

export const GraphExercise = memo(GraphExerciseInner);

interface IGraphExerciseLegendProps {
  cursorIdx: number | null;
  data: ILiftographExerciseGraphData["data"];
  units: string;
  selectedType: IExerciseSelectedType;
  isWithOneRm?: boolean;
  record?: IHistoryRecord;
  exercise: IExerciseType;
  dispatch?: IDispatch;
}

function GraphExerciseLegend(props: IGraphExerciseLegendProps): JSX.Element | null {
  const { cursorIdx, data, units } = props;
  if (cursorIdx == null) {
    return null;
  }
  const timestamp = data[0][cursorIdx];
  const weight = data[1][cursorIdx];
  const reps = data[2][cursorIdx];
  const onerm = data[3][cursorIdx];
  const volume = data[4][cursorIdx];
  const bodyweight = data[5][cursorIdx];
  const date = new Date(timestamp * 1000);

  const entryNotes = (props.record?.entries || [])
    .filter((e) => Exercise_eq(props.exercise, e.exercise))
    .map((e) => e.notes)
    .filter((e): e is string => !!e);

  const entries = (props.record?.entries || []).filter((e) => e.exercise.id === props.exercise.id);
  const stateVars: string[] = [];
  for (const entry of entries) {
    for (const key of ObjectUtils_keys(entry.state || {})) {
      const value = entry.state?.[key];
      const displayValue = Weight_isOrPct(value) ? Weight_display(value) : value;
      stateVars.push(`${key}: ${displayValue}`);
    }
    for (const key of ObjectUtils_keys(entry.vars || {})) {
      const name = ({ rm1: "1 Rep Max" } as Record<string, string>)[key] || key;
      const value = entry.vars?.[key];
      const displayValue = Weight_isOrPct(value) ? Weight_display(value) : value;
      stateVars.push(`${name}: ${displayValue}`);
    }
  }
  const groups = CollectionUtils_inGroupsOf(2, stateVars);

  const onWorkoutPress = (): void => {
    if (props.record && props.dispatch) {
      props.dispatch(Thunk_editHistoryRecord(props.record));
    }
  };

  return (
    <View className="pr-6">
      {weight != null && reps != null ? (
        <View className="flex-row flex-wrap items-center">
          {props.selectedType === "weight" ? (
            <>
              <Text className="text-sm">
                {DateUtils_format(date)}, <Text className="text-sm font-bold">{weight}</Text> {units}s x{" "}
                <Text className="text-sm font-bold">{reps}</Text> reps
                {props.isWithOneRm && onerm != null && (
                  <Text className="text-sm">
                    , e1RM = <Text className="text-sm font-bold">{onerm.toFixed(2)}</Text> {units}s
                  </Text>
                )}
              </Text>
              {!!(props.record && props.dispatch) && (
                <Pressable onPress={onWorkoutPress}>
                  <Text className="ml-2 text-sm font-bold underline text-text-link">Workout</Text>
                </Pressable>
              )}
            </>
          ) : (
            <>
              <Text className="text-sm">
                {DateUtils_format(date)}, Volume:{" "}
                <Text className="text-sm font-bold">
                  {volume} {units}s
                </Text>
              </Text>
              {!!(props.record && props.dispatch) && (
                <Pressable onPress={onWorkoutPress}>
                  <Text className="ml-2 text-sm font-bold underline text-text-link">Workout</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      ) : bodyweight != null ? (
        <Text className="text-sm">
          {DateUtils_format(date)}, Bodyweight - <Text className="text-sm font-bold">{bodyweight}</Text> {units}
        </Text>
      ) : null}
      {!!(entryNotes.length > 0 || props.record?.notes) && (
        <View className="mt-1">
          {entryNotes.map((n, i) => (
            <Text key={i} className="text-xs text-text-secondary">
              • {n}
            </Text>
          ))}
          {!!props.record?.notes && (
            <Text className="text-xs text-text-secondary">
              <Text className="text-xs font-bold">Workout: </Text>
              {props.record.notes}
            </Text>
          )}
        </View>
      )}
      {groups.length > 0 && (
        <View className="mt-1">
          {groups.map(([a, b], i) => (
            <View key={i} className="flex-row gap-4">
              <Text className="flex-1 text-xs">{a}</Text>
              <Text className="flex-1 text-xs">{b ?? ""}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
