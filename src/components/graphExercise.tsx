import { JSX, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { Select } from "./primitives/select";
import { CollectionUtils_sort, CollectionUtils_inGroupsOf } from "../utils/collection";
import { DateUtils_format } from "../utils/date";
import { equipmentName, Exercise_eq, Exercise_get } from "../models/exercise";
import { Weight_convertTo, Weight_build, Weight_getOneRepMax, Weight_isOrPct, Weight_display } from "../models/weight";
import { IHistoryRecord, IExerciseType, ISettings, IExerciseSelectedType } from "../types";
import { IDispatch } from "../ducks/types";
import { Reps_volume } from "../models/set";
import { ObjectUtils_keys } from "../utils/object";
import { History_getMaxWeightSetFromEntry, History_getMax1RMSetFromEntry } from "../models/history";
import { Tailwind_colors, Tailwind_semantic } from "../utils/tailwindConfig";
import { Colors_hexToRgba } from "../utils/colors";
import { Thunk_editHistoryRecord } from "../ducks/thunks";
import { LineChart, ILineChartSeries, ILineChartHandle } from "./lineChart";
import { useActiveGraph } from "./activeGraphContext";
import { IconCloseCircle } from "./icons/iconCloseCircle";

interface IGraphProps {
  id?: string;
  history: IHistoryRecord[];
  isWithOneRm?: boolean;
  isWithProgramLines?: boolean;
  exercise: IExerciseType;
  settings: ISettings;
  title?: string;
  subtitle?: string;
  isSameXAxis?: boolean;
  minX: number;
  maxX: number;
  bodyweightData?: [number, number][];
  initialType?: IExerciseSelectedType;
  dispatch?: IDispatch;
}

interface IGraphData {
  data: [number[], (number | null)[], (number | null)[], (number | null)[], (number | null)[], (number | null)[]];
  historyRecords: { [key: number]: IHistoryRecord };
  changeProgramTimes: [number, string][];
}

function getData(
  history: IHistoryRecord[],
  exerciseType: IExerciseType,
  settings: ISettings,
  isWithOneRm?: boolean,
  bodyweightData?: [number, number][]
): IGraphData {
  const changeProgramTimes: [number, string][] = [];
  let currentProgram: string | undefined = undefined;
  const historyRecords: { [key: number]: IHistoryRecord } = {};
  const normalizedData = CollectionUtils_sort(history, (a, b) => a.startTime - b.startTime).reduce<
    [number, number | null, number | null, number | null, number | null, number | null][]
  >((acc, i) => {
    if (!currentProgram || currentProgram !== i.programName) {
      currentProgram = i.programName;
      changeProgramTimes.push([new Date(Date.parse(i.date)).getTime() / 1000, currentProgram]);
    }
    const entry = i.entries.filter((e) => Exercise_eq(e.exercise, exerciseType))[0];
    if (entry != null) {
      const maxSet = History_getMaxWeightSetFromEntry(entry);
      const maxe1RMSet = History_getMax1RMSetFromEntry(entry);
      const volume = Reps_volume(entry.sets, settings.units);
      if (maxSet != null) {
        const convertedWeight = Weight_convertTo(
          maxSet.completedWeight ?? maxSet.weight ?? Weight_build(0, settings.units),
          settings.units
        );
        let onerm = null;
        if (isWithOneRm) {
          const set = maxe1RMSet || maxSet;
          onerm = Weight_getOneRepMax(
            Weight_convertTo(set.completedWeight ?? set.weight ?? Weight_build(0, settings.units), settings.units),
            set.completedReps || 0,
            set.completedRpe ?? set.rpe ?? 10
          ).value;
        }
        const timestamp = new Date(Date.parse(i.date)).getTime() / 1000;
        historyRecords[timestamp] = i;
        acc.push([
          timestamp,
          Weight_convertTo(convertedWeight, settings.units).value,
          maxSet.completedReps!,
          onerm,
          volume.value,
          null,
        ]);
      }
    }
    return acc;
  }, []);
  const normalizedBodyweightData = (bodyweightData || []).map<
    [number, number | null, number | null, number | null, number | null, number | null]
  >((i) => {
    return [i[0], null, null, null, null, i[1]];
  });
  const sorted = CollectionUtils_sort(
    normalizedData.concat(normalizedBodyweightData),
    (a, b) => (a[0] || 0) - (b[0] || 0)
  );
  const data = sorted.reduce<
    [number[], (number | null)[], (number | null)[], (number | null)[], (number | null)[], (number | null)[]]
  >(
    (acc, i) => {
      acc[0].push(i[0]);
      acc[1].push(i[1]);
      acc[2].push(i[2]);
      acc[3].push(i[3]);
      acc[4].push(i[4]);
      acc[5].push(i[5]);
      return acc;
    },
    [[], [], [], [], [], []]
  );
  return { data, changeProgramTimes, historyRecords };
}

function GraphExerciseInner(props: IGraphProps): JSX.Element {
  const [selectedType, setSelectedType] = useState<IExerciseSelectedType>(props.initialType || "weight");
  const eqName = equipmentName(props.exercise.equipment);
  const units = props.settings.units;
  const exercise = Exercise_get(props.exercise, props.settings.exercises);

  const result = useMemo(
    () => getData(props.history, props.exercise, props.settings, props.isWithOneRm, props.bodyweightData),
    [props.history, props.exercise, props.settings, props.isWithOneRm, props.bodyweightData]
  );

  const [cursorIdx, setCursorIdx] = useState<number | null>(null);

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

  const { activeId, setActive } = useActiveGraph();
  const isActive = props.id != null && activeId === props.id;
  const chartRef = useRef<ILineChartHandle>(null);

  const handleCursorChange = useCallback(
    (idx: number | null) => {
      setCursorIdx(idx);
      if (idx != null && props.id != null && activeId !== props.id) {
        setActive(props.id);
      }
    },
    [activeId, props.id, setActive]
  );

  useEffect(() => {
    if (!isActive) {
      setCursorIdx(null);
      chartRef.current?.clearCursor();
    }
  }, [isActive]);

  const onCloseOverlay = useCallback(() => {
    chartRef.current?.clearCursor();
    setCursorIdx(null);
    setActive(null);
  }, [setActive]);

  const timestamps = result.data[0];
  const cursorTimestamp = cursorIdx != null ? timestamps[cursorIdx] : null;
  const cursorRecord = cursorTimestamp != null ? result.historyRecords[cursorTimestamp] : undefined;
  const overlayVisible = isActive && cursorIdx != null;

  return (
    <View className="relative" testID="graph" data-testid="graph">
      <View testID="graph-data" data-testid="graph-data">
        <View className="flex-row items-center flex-1 mb-1">
          <View className="flex-1">
            <View>
              <Text className="text-lg font-semibold leading-6 text-left u-title">{props.title || exercise.name}</Text>
            </View>
            <View>
              <Text className="text-xs leading-4 text-left text-text-secondary">{props.subtitle || eqName}</Text>
            </View>
          </View>
          <View>
            <Select
              value={selectedType}
              onChange={(v) => setSelectedType(v as IExerciseSelectedType)}
              options={[
                { value: "weight", label: "Max Weight" },
                { value: "volume", label: "Volume" },
              ]}
              className="p-2 text-right bg-background-default"
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
            yAxisFormatter={(v) => `${Math.round(v)}`}
          />
          {overlayVisible && (
            <View
              className="absolute border rounded-lg left-2 right-2 border-border-cardpurple"
              style={{
                top: -60,
                zIndex: 10,
                padding: 8,
                backgroundColor: Colors_hexToRgba(Tailwind_semantic().background.subtlecardpurple, 0.9),
              }}
            >
              <Pressable onPress={onCloseOverlay} style={{ position: "absolute", top: 4, right: 4, zIndex: 20 }}>
                <IconCloseCircle size={18} />
              </Pressable>
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
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export const GraphExercise = memo(GraphExerciseInner);

interface IGraphExerciseLegendProps {
  cursorIdx: number | null;
  data: IGraphData["data"];
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
              {props.record && props.dispatch && (
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
              {props.record && props.dispatch && (
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
      {(entryNotes.length > 0 || props.record?.notes) && (
        <View className="mt-1">
          {entryNotes.map((n, i) => (
            <Text key={i} className="text-xs text-text-secondary">
              • {n}
            </Text>
          ))}
          {props.record?.notes && (
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
