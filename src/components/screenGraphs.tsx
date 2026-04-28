import { JSX, useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { ActiveGraphContext, IActiveGraphContext } from "./activeGraphContext";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { GraphExercise } from "./graphExercise";
import { History_collectMuscleGroups, History_collectProgramChangeTimes } from "../models/history";
import { ObjectUtils_keys } from "../utils/object";
import { ISettings, IHistoryRecord, IStats, IScreenMuscle } from "../types";
import { getLengthDataForGraph, getPercentageDataForGraph, getWeightDataForGraph, GraphStats } from "./graphStats";
import { INavCommon } from "../models/state";
import { useNavOptions } from "../navigation/useNavOptions";
import { IconFilter } from "./icons/iconFilter";
import { HelpGraphs } from "./help/helpGraphs";
import { Collector } from "../utils/collector";
import { GraphMuscleGroup } from "./graphMuscleGroup";
import { CollectionUtils_sort } from "../utils/collection";
import { Exercise_fromKey } from "../models/exercise";
import { navigationRef } from "../navigation/navigationRef";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  stats: IStats;
  history: IHistoryRecord[];
  navCommon: INavCommon;
}

export function ScreenGraphs(props: IProps): JSX.Element {
  const { settings } = props;
  const { isWithBodyweight, isSameXAxis, isWithOneRm, isWithProgramLines } = settings.graphsSettings;
  const hasBodyweight = props.settings.graphs.graphs.some((g) => g.id === "weight");
  let bodyweightData: [number, number][] = [];

  const sortedHistory = CollectionUtils_sort(props.history, (a, b) => {
    return new Date(Date.parse(a.date)).getTime() - new Date(Date.parse(b.date)).getTime();
  });

  const historyCollector = Collector.build(sortedHistory)
    .addFn(History_collectMuscleGroups(props.settings))
    .addFn(History_collectProgramChangeTimes());
  const [muscleGroupsData, programChangeTimes] = historyCollector.run();

  if (hasBodyweight && isWithBodyweight) {
    bodyweightData = getWeightDataForGraph(props.stats.weight.weight || [], props.settings);
  }
  let maxX = 0;
  let minX = Infinity;
  for (const hr of props.history) {
    if (maxX < hr.startTime) {
      maxX = hr.startTime;
    }
    if (minX > hr.startTime) {
      minX = hr.startTime;
    }
  }
  if (isSameXAxis) {
    for (const key of ObjectUtils_keys(props.stats.weight)) {
      for (const value of props.stats.weight[key] || []) {
        if (minX > value.timestamp) {
          minX = value.timestamp;
        }
        if (maxX < value.timestamp) {
          maxX = value.timestamp;
        }
      }
    }
    for (const key of ObjectUtils_keys(props.stats.length)) {
      for (const value of props.stats.length[key] || []) {
        if (minX > value.timestamp) {
          minX = value.timestamp;
        } else if (maxX < value.timestamp) {
          maxX = value.timestamp;
        }
      }
    }
  }

  useNavOptions({
    navTitle: "Graphs",
    navHelpContent: <HelpGraphs />,
    navRightButtons: [
      <Pressable
        key="filter"
        data-cy="graphs-modify" data-testid="graphs-modify"
        testID="graphs-modify"
        className="p-2 nm-graphs-navbar-filter"
        onPress={() => navigationRef.navigate("graphsModal")}
      >
        <IconFilter />
      </Pressable>,
    ],
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeGraphValue = useMemo<IActiveGraphContext>(() => ({ activeId, setActive: setActiveId }), [activeId]);

  if (props.settings.graphs.graphs.length === 0) {
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
      <View className="pt-4 pb-4">
        {props.settings.graphs.graphs.map((graph, i) => {
          const id = `${graph.type}-${graph.id}-${i}`;
          if (graph.type === "exercise") {
            return (
              <View
                key={`${graph.id}_${isSameXAxis}_${isWithBodyweight}_${isWithOneRm}_${isWithProgramLines}`}
                className="mx-4 mb-2"
              >
                <GraphExercise
                  id={id}
                  initialType={props.settings.graphsSettings.defaultType}
                  isSameXAxis={isSameXAxis}
                  minX={Math.round(minX / 1000)}
                  maxX={Math.round(maxX / 1000)}
                  bodyweightData={hasBodyweight && isWithBodyweight ? bodyweightData : undefined}
                  isWithOneRm={isWithOneRm}
                  settings={props.settings}
                  isWithProgramLines={isWithProgramLines}
                  history={props.history}
                  exercise={Exercise_fromKey(graph.id)}
                  dispatch={props.dispatch}
                />
              </View>
            );
          } else if (graph.type === "statsWeight") {
            const collection = getWeightDataForGraph(props.stats.weight[graph.id] || [], props.settings);
            return (
              <View key={`${graph.id}_${isSameXAxis}`} className="mb-2">
                <GraphStats
                  id={id}
                  isSameXAxis={isSameXAxis}
                  minX={Math.round(minX / 1000)}
                  maxX={Math.round(maxX / 1000)}
                  units={props.settings.units}
                  settings={props.settings}
                  collection={collection}
                  statsKey={graph.id}
                />
              </View>
            );
          } else if (graph.type === "statsLength") {
            const collection = getLengthDataForGraph(props.stats.length[graph.id] || [], props.settings);
            return (
              <View key={graph.id} className="mb-2">
                <GraphStats
                  id={id}
                  isSameXAxis={isSameXAxis}
                  minX={Math.round(minX / 1000)}
                  maxX={Math.round(maxX / 1000)}
                  units={props.settings.lengthUnits}
                  settings={props.settings}
                  collection={collection}
                  statsKey={graph.id}
                />
              </View>
            );
          } else if (graph.type === "muscleGroup") {
            const muscleGroup = graph.id as IScreenMuscle | "total";
            return (
              <GraphMuscleGroup
                key={graph.id}
                id={id}
                initialType={props.settings.graphsSettings.defaultMuscleGroupType}
                programChangeTimes={isWithProgramLines ? programChangeTimes.changeProgramTimes : undefined}
                data={muscleGroupsData[muscleGroup] ?? [[], [], []]}
                muscleGroup={muscleGroup}
                settings={props.settings}
              />
            );
          } else {
            const collection = getPercentageDataForGraph(props.stats.percentage[graph.id] || [], props.settings);
            return (
              <View key={graph.id} className="mb-2">
                <GraphStats
                  id={id}
                  isSameXAxis={isSameXAxis}
                  minX={Math.round(minX / 1000)}
                  maxX={Math.round(maxX / 1000)}
                  units="%"
                  settings={props.settings}
                  collection={collection}
                  statsKey={graph.id}
                />
              </View>
            );
          }
        })}
      </View>
    </ActiveGraphContext.Provider>
  );
}
