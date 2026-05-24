import { JSX, useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { ActiveGraphContext, IActiveGraphContext } from "./activeGraphContext";
import { Text } from "./primitives/text";
import { GraphExercise } from "./graphExercise";
import { History_getGraphsAggregates } from "../models/history";
import { ObjectUtils_keys } from "../utils/object";
import { IScreenMuscle } from "../types";
import { getLengthDataForGraph, getPercentageDataForGraph, getWeightDataForGraph, GraphStats } from "./graphStats";
import { useNavOptions } from "../navigation/useNavOptions";
import { IconFilter } from "./icons/iconFilter";
import { GraphMuscleGroup } from "./graphMuscleGroup";
import { Exercise_fromKey } from "../models/exercise";
import { navigateToModal } from "../navigation/navigationService";
import { useProgressiveItems } from "../utils/useProgressiveItems";
import { useTrackedState, useTrackedDispatch, untrack } from "../navigation/TrackedStateContext";
import { usePerfRenderCount } from "../utils/usePerfRenderCount";
import { useTimedMemo } from "../utils/useTimedMemo";

const navRightButtons = [
  <Pressable
    key="filter"
    data-testid="graphs-modify"
    testID="graphs-modify"
    className="p-2 nm-graphs-navbar-filter"
    onPress={() => navigateToModal("graphsModal")}
  >
    <IconFilter />
  </Pressable>,
];

export function ScreenGraphs(): JSX.Element {
  usePerfRenderCount("ScreenGraphs");
  const trackedState = useTrackedState();
  const dispatch = useTrackedDispatch();

  // Subscribe to the three state slices we need; untrack so useMemo deps see stable refs.
  const settings = untrack(trackedState.storage.settings);
  const stats = untrack(trackedState.storage.stats);
  const history = untrack(trackedState.storage.history);

  const { isWithBodyweight, isSameXAxis, isWithOneRm, isWithProgramLines } = settings.graphsSettings;
  const hasBodyweight = settings.graphs.graphs.some((g) => g.id === "weight");

  const { muscleGroupsData, programChangeTimes } = useTimedMemo(
    "screenGraphs.graphsAggregates",
    () => History_getGraphsAggregates(history, settings),
    [history, settings]
  );

  const bodyweightData = useTimedMemo<[number, number][]>(
    "screenGraphs.bodyweightData",
    () => {
      if (hasBodyweight && isWithBodyweight) {
        return getWeightDataForGraph(stats.weight.weight || [], settings);
      }
      return [];
    },
    [hasBodyweight, isWithBodyweight, stats.weight.weight, settings]
  );

  const { minX, maxX } = useTimedMemo(
    "screenGraphs.minMaxX",
    () => {
      let max = 0;
      let min = Infinity;
      for (const hr of history) {
        if (max < hr.startTime) {
          max = hr.startTime;
        }
        if (min > hr.startTime) {
          min = hr.startTime;
        }
      }
      if (isSameXAxis) {
        for (const key of ObjectUtils_keys(stats.weight)) {
          for (const value of stats.weight[key] || []) {
            if (min > value.timestamp) {
              min = value.timestamp;
            }
            if (max < value.timestamp) {
              max = value.timestamp;
            }
          }
        }
        for (const key of ObjectUtils_keys(stats.length)) {
          for (const value of stats.length[key] || []) {
            if (min > value.timestamp) {
              min = value.timestamp;
            } else if (max < value.timestamp) {
              max = value.timestamp;
            }
          }
        }
      }
      return { minX: min, maxX: max };
    },
    [history, stats.weight, stats.length, isSameXAxis]
  );

  useNavOptions({
    navTitle: "Graphs",
    navHelpKey: "graphs",
    navRightButtons,
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeGraphValue = useMemo<IActiveGraphContext>(() => ({ activeId, setActive: setActiveId }), [activeId]);

  const visibleGraphs = useProgressiveItems(settings.graphs.graphs, {
    initialBatch: 3,
    batchSize: 3,
    debugLabel: "Graphs",
  });

  const roundedMinX = useTimedMemo("screenGraphs.roundedMinX", () => Math.round(minX / 1000), [minX]);
  const roundedMaxX = useTimedMemo("screenGraphs.roundedMaxX", () => Math.round(maxX / 1000), [maxX]);
  const bodyweightForGraphs = hasBodyweight && isWithBodyweight ? bodyweightData : undefined;
  const programChangeTimesForGraphs = isWithProgramLines ? programChangeTimes.changeProgramTimes : undefined;

  const preparedGraphs = useTimedMemo(
    "screenGraphs.preparedGraphs",
    () => {
      return visibleGraphs.map((graph) => {
        if (graph.type === "exercise") {
          return { graph, exercise: Exercise_fromKey(graph.id), collection: undefined };
        }
        if (graph.type === "statsWeight") {
          return {
            graph,
            exercise: undefined,
            collection: getWeightDataForGraph(stats.weight[graph.id] || [], settings),
          };
        }
        if (graph.type === "statsLength") {
          return {
            graph,
            exercise: undefined,
            collection: getLengthDataForGraph(stats.length[graph.id] || [], settings),
          };
        }
        if (graph.type === "muscleGroup") {
          return { graph, exercise: undefined, collection: undefined };
        }
        return {
          graph,
          exercise: undefined,
          collection: getPercentageDataForGraph(stats.percentage[graph.id] || [], settings),
        };
      });
    },
    [visibleGraphs, stats.weight, stats.length, stats.percentage, settings]
  );

  if (settings.graphs.graphs.length === 0) {
    return (
      <View className="p-8">
        <Text className="text-2xl font-bold text-center text-gray-600">
          Select graphs you want to display by tapping filter icon at right top corner.
        </Text>
      </View>
    );
  }

  return (
    <ActiveGraphContext.Provider value={activeGraphValue}>
      <View className="pt-8 pb-4">
        {preparedGraphs.map((entry, i) => {
          const { graph, exercise, collection } = entry;
          const id = `${graph.type}-${graph.id}-${i}`;
          if (graph.type === "exercise" && exercise) {
            return (
              <View
                key={`${graph.id}_${isSameXAxis}_${isWithBodyweight}_${isWithOneRm}_${isWithProgramLines}`}
                className="mx-4 mb-2"
              >
                <GraphExercise
                  id={id}
                  initialType={settings.graphsSettings.defaultType}
                  isSameXAxis={isSameXAxis}
                  minX={roundedMinX}
                  maxX={roundedMaxX}
                  bodyweightData={bodyweightForGraphs}
                  isWithOneRm={isWithOneRm}
                  settings={settings}
                  isWithProgramLines={isWithProgramLines}
                  history={history}
                  exercise={exercise}
                  dispatch={dispatch}
                />
              </View>
            );
          } else if (graph.type === "statsWeight" && collection) {
            return (
              <View key={`${graph.id}_${isSameXAxis}`} className="mx-4 mb-2">
                <GraphStats
                  id={id}
                  isSameXAxis={isSameXAxis}
                  minX={roundedMinX}
                  maxX={roundedMaxX}
                  units={settings.units}
                  settings={settings}
                  collection={collection}
                  statsKey={graph.id}
                />
              </View>
            );
          } else if (graph.type === "statsLength" && collection) {
            return (
              <View key={graph.id} className="mx-4 mb-2">
                <GraphStats
                  id={id}
                  isSameXAxis={isSameXAxis}
                  minX={roundedMinX}
                  maxX={roundedMaxX}
                  units={settings.lengthUnits}
                  settings={settings}
                  collection={collection}
                  statsKey={graph.id}
                />
              </View>
            );
          } else if (graph.type === "muscleGroup") {
            const muscleGroup = graph.id as IScreenMuscle | "total";
            return (
              <View key={graph.id} className="mx-4 mb-2">
                <GraphMuscleGroup
                  key={graph.id}
                  id={id}
                  initialType={settings.graphsSettings.defaultMuscleGroupType}
                  programChangeTimes={programChangeTimesForGraphs}
                  data={muscleGroupsData[muscleGroup] ?? [[], [], []]}
                  muscleGroup={muscleGroup}
                  settings={settings}
                />
              </View>
            );
          } else if (collection) {
            return (
              <View key={graph.id} className="mx-4 mb-2">
                <GraphStats
                  id={id}
                  isSameXAxis={isSameXAxis}
                  minX={roundedMinX}
                  maxX={roundedMaxX}
                  units="%"
                  settings={settings}
                  collection={collection}
                  statsKey={graph.id}
                />
              </View>
            );
          } else {
            return null;
          }
        })}
      </View>
    </ActiveGraphContext.Provider>
  );
}
