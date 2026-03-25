import React, { useMemo } from "react";
import { FlatList, View, Text, Pressable, useWindowDimensions, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useStoreState } from "../context/StoreContext";
import { useDispatch } from "../context/DispatchContext";
import { GraphExercise } from "../components/GraphExercise";
import { GraphMuscleGroup } from "../components/GraphMuscleGroup";
import { GraphStats } from "../components/GraphStats";
import {
  GraphData_weightStats,
  GraphData_lengthStats,
  GraphData_percentageStats,
} from "@shared/models/graphData";
import {
  History_findAllMaxSetsPerId,
  History_collectMuscleGroups,
  History_collectProgramChangeTimes,
} from "@shared/models/history";
import { CollectionUtils_sort } from "@shared/utils/collection";
import { ObjectUtils_keys } from "@shared/utils/object";
import { Exercise_fromKey } from "@shared/models/exercise";
import { Collector } from "@shared/utils/collector";
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";
import type { IGraph, IScreenMuscle, IHistoryRecord } from "@shared/types";

export function GraphsScreen(): React.ReactElement {
  const state = useStoreState();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const sem = Tailwind_semantic();

  const settings = state.storage.settings;
  const history = state.storage.history;
  const stats = state.storage.stats;
  const graphs = settings.graphs.graphs;
  const { isWithBodyweight, isSameXAxis, isWithOneRm, isWithProgramLines } = settings.graphsSettings;

  const sortedHistory = useMemo(
    () =>
      CollectionUtils_sort(history, (a, b) => {
        return new Date(Date.parse(a.date)).getTime() - new Date(Date.parse(b.date)).getTime();
      }),
    [history]
  );

  const collectorResults = useMemo(() => {
    const collector = Collector.build(sortedHistory)
      .addFn(History_collectMuscleGroups(settings))
      .addFn(History_collectProgramChangeTimes());
    return collector.run();
  }, [sortedHistory, settings]);

  const [muscleGroupsData, programChangeTimes] = collectorResults;

  const hasBodyweight = graphs.some((g) => g.id === "weight");
  const bodyweightData = useMemo(() => {
    if (hasBodyweight && isWithBodyweight) {
      return GraphData_weightStats(stats.weight.weight || [], settings);
    }
    return undefined;
  }, [hasBodyweight, isWithBodyweight, stats.weight.weight, settings]);

  const { minX, maxX } = useMemo(() => {
    let mx = 0;
    let mn = Infinity;
    for (const hr of history) {
      if (mx < hr.startTime) mx = hr.startTime;
      if (mn > hr.startTime) mn = hr.startTime;
    }
    if (isSameXAxis) {
      for (const key of ObjectUtils_keys(stats.weight)) {
        for (const value of stats.weight[key] || []) {
          if (mn > value.timestamp) mn = value.timestamp;
          if (mx < value.timestamp) mx = value.timestamp;
        }
      }
      for (const key of ObjectUtils_keys(stats.length)) {
        for (const value of stats.length[key] || []) {
          if (mn > value.timestamp) mn = value.timestamp;
          if (mx < value.timestamp) mx = value.timestamp;
        }
      }
    }
    return { minX: mn, maxX: mx };
  }, [history, stats, isSameXAxis]);

  const handleGoToWorkout = useMemo(
    () => (hr: IHistoryRecord) => {
      dispatch({ type: "EditHistoryRecord", historyRecord: hr });
    },
    [dispatch]
  );

  const openSettings = useMemo(
    () => () => {
      (navigation as any).navigate("ModalGraphsSheet");
    },
    [navigation]
  );

  const renderItem = useMemo(
    () =>
      ({ item: graph }: { item: IGraph }) => {
        if (graph.type === "exercise") {
          return (
            <View style={styles.graphItem}>
              <GraphExercise
                initialType={settings.graphsSettings.defaultType}
                isSameXAxis={isSameXAxis}
                minX={Math.round(minX / 1000)}
                maxX={Math.round(maxX / 1000)}
                bodyweightData={hasBodyweight && isWithBodyweight ? bodyweightData : undefined}
                isWithOneRm={isWithOneRm}
                isWithProgramLines={isWithProgramLines}
                settings={settings}
                history={history}
                exercise={Exercise_fromKey(graph.id)}
                width={screenWidth}
                onGoToWorkout={handleGoToWorkout}
              />
            </View>
          );
        }

        if (graph.type === "muscleGroup") {
          const muscleGroup = graph.id as IScreenMuscle | "total";
          return (
            <View style={styles.graphItem}>
              <GraphMuscleGroup
                initialType={settings.graphsSettings.defaultMuscleGroupType}
                programChangeTimes={isWithProgramLines ? programChangeTimes.changeProgramTimes : undefined}
                data={muscleGroupsData[muscleGroup] ?? [[], [], []]}
                muscleGroup={muscleGroup}
                settings={settings}
                width={screenWidth}
              />
            </View>
          );
        }

        if (graph.type === "statsWeight") {
          const collection = GraphData_weightStats(stats.weight[graph.id] || [], settings);
          return (
            <View style={styles.graphItem}>
              <GraphStats
                isSameXAxis={isSameXAxis}
                minX={Math.round(minX / 1000)}
                maxX={Math.round(maxX / 1000)}
                units={settings.units}
                collection={collection}
                statsKey={graph.id}
                width={screenWidth}
              />
            </View>
          );
        }

        if (graph.type === "statsLength") {
          const collection = GraphData_lengthStats(stats.length[graph.id] || [], settings);
          return (
            <View style={styles.graphItem}>
              <GraphStats
                isSameXAxis={isSameXAxis}
                minX={Math.round(minX / 1000)}
                maxX={Math.round(maxX / 1000)}
                units={settings.lengthUnits}
                collection={collection}
                statsKey={graph.id}
                width={screenWidth}
              />
            </View>
          );
        }

        // statsPercentage
        const collection = GraphData_percentageStats(stats.percentage[graph.id] || [], settings);
        return (
          <View style={styles.graphItem}>
            <GraphStats
              isSameXAxis={isSameXAxis}
              minX={Math.round(minX / 1000)}
              maxX={Math.round(maxX / 1000)}
              units="%"
              settings={settings}
              collection={collection}
              statsKey={graph.id}
              width={screenWidth}
            />
          </View>
        );
      },
    [
      settings,
      history,
      stats,
      isSameXAxis,
      isWithOneRm,
      isWithProgramLines,
      isWithBodyweight,
      bodyweightData,
      muscleGroupsData,
      programChangeTimes,
      minX,
      maxX,
      screenWidth,
      hasBodyweight,
      handleGoToWorkout,
    ]
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: sem.background.default }]} edges={["top"]}>
      <View style={styles.navbar}>
        <Text style={[styles.navTitle, { color: sem.text.primary }]}>Graphs</Text>
        <Pressable onPress={openSettings} style={styles.filterBtn}>
          <Text style={[styles.filterIcon, { color: sem.text.primary }]}>⚙</Text>
        </Pressable>
      </View>
      {graphs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: sem.text.secondary }]}>
            Select graphs you want to display by tapping the ⚙ icon at top right.
          </Text>
        </View>
      ) : (
        <FlatList
          data={graphs}
          renderItem={renderItem}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  navbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  filterBtn: {
    padding: 8,
  },
  filterIcon: {
    fontSize: 20,
  },
  list: {
    paddingBottom: 16,
  },
  graphItem: {
    marginBottom: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
});
