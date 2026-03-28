import React, { useMemo } from "react";
import { FlatList, View, Text, Pressable, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { IRootNavigation } from "../navigation/types";
import { useStoreStateWhenFocused } from "../context/StoreContext";
import { useDispatch } from "../context/DispatchContext";
import { GraphExercise } from "../components/GraphExercise";
import { GraphMuscleGroup } from "../components/GraphMuscleGroup";
import { GraphStats } from "../components/GraphStats";
import {
  GraphData_weightStats,
  GraphData_lengthStats,
  GraphData_percentageStats,
  GraphData_xRange,
} from "@shared/models/graphData";
import { History_collectMuscleGroups, History_collectProgramChangeTimes } from "@shared/models/history";
import { CollectionUtils_sort } from "@shared/utils/collection";
import { Exercise_fromKey } from "@shared/models/exercise";
import { Collector } from "@shared/utils/collector";
import type { IGraph, IScreenMuscle } from "@shared/types";

export function GraphsScreen(): React.ReactElement {
  const state = useStoreStateWhenFocused();
  const dispatch = useDispatch();
  const navigation = useNavigation<IRootNavigation>();
  const { width: screenWidth } = useWindowDimensions();

  const settings = state.storage.settings;
  const history = state.storage.history;
  const stats = state.storage.stats;
  const graphs = settings.graphs.graphs;
  const { isWithBodyweight, isSameXAxis, isWithOneRm, isWithProgramLines } = settings.graphsSettings;

  const sortedHistory = useMemo(
    () =>
      CollectionUtils_sort(
        history,
        (a, b) => new Date(Date.parse(a.date)).getTime() - new Date(Date.parse(b.date)).getTime()
      ),
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

  const { minX, maxX } = useMemo(() => GraphData_xRange(history, stats, isSameXAxis), [history, stats, isSameXAxis]);

  function renderItem({ item: graph }: { item: IGraph }): React.ReactElement {
    if (graph.type === "exercise") {
      return (
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
          onGoToWorkout={(hr) => dispatch({ type: "EditHistoryRecord", historyRecord: hr })}
        />
      );
    }

    if (graph.type === "muscleGroup") {
      const muscleGroup = graph.id as IScreenMuscle | "total";
      return (
        <GraphMuscleGroup
          initialType={settings.graphsSettings.defaultMuscleGroupType}
          programChangeTimes={isWithProgramLines ? programChangeTimes.changeProgramTimes : undefined}
          data={muscleGroupsData[muscleGroup] ?? [[], [], []]}
          muscleGroup={muscleGroup}
          settings={settings}
          width={screenWidth}
        />
      );
    }

    if (graph.type === "statsWeight") {
      const collection = GraphData_weightStats(stats.weight[graph.id] || [], settings);
      return (
        <GraphStats
          isSameXAxis={isSameXAxis}
          minX={Math.round(minX / 1000)}
          maxX={Math.round(maxX / 1000)}
          units={settings.units}
          collection={collection}
          statsKey={graph.id}
          width={screenWidth}
        />
      );
    }

    if (graph.type === "statsLength") {
      const collection = GraphData_lengthStats(stats.length[graph.id] || [], settings);
      return (
        <GraphStats
          isSameXAxis={isSameXAxis}
          minX={Math.round(minX / 1000)}
          maxX={Math.round(maxX / 1000)}
          units={settings.lengthUnits}
          collection={collection}
          statsKey={graph.id}
          width={screenWidth}
        />
      );
    }

    // statsPercentage
    const collection = GraphData_percentageStats(stats.percentage[graph.id] || [], settings);
    return (
      <GraphStats
        isSameXAxis={isSameXAxis}
        minX={Math.round(minX / 1000)}
        maxX={Math.round(maxX / 1000)}
        units="%"
        collection={collection}
        statsKey={graph.id}
        width={screenWidth}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-default" edges={["top"]}>
      <View className="flex-row justify-between items-center px-4 py-3">
        <Text className="text-xl font-bold text-text-primary">Graphs</Text>
        <Pressable className="p-2" onPress={() => navigation.navigate("ModalGraphsSheet")}>
          <Text className="text-xl text-text-primary">⚙</Text>
        </Pressable>
      </View>
      {graphs.length === 0 ? (
        <View className="flex-1 justify-center items-center p-8">
          <Text className="text-lg font-bold text-center text-text-secondary">
            Select graphs you want to display by tapping the ⚙ icon at top right.
          </Text>
        </View>
      ) : (
        <FlatList
          data={graphs}
          renderItem={renderItem}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerClassName="pb-4"
        />
      )}
    </SafeAreaView>
  );
}
