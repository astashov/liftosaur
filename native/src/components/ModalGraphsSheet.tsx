import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable, Switch } from "react-native";
import { useStoreState } from "../context/StoreContext";
import { useDispatch } from "../context/DispatchContext";
import { lb } from "lens-shmens";
import { updateSettings } from "@shared/models/state";
import {
  EditGraphs_removeGraph,
  EditGraphs_addExerciseGraph,
  EditGraphs_addMuscleGroupGraph,
  EditGraphs_addStatsWeightGraph,
  EditGraphs_addStatsLengthGraph,
  EditGraphs_addStatsPercentageGraph,
} from "@shared/models/editGraphs";
import { Exercise_get, Exercise_fromKey, Exercise_toKey, equipmentName } from "@shared/models/exercise";
import { Muscle_getAvailableMuscleGroups, Muscle_getMuscleGroupName } from "@shared/models/muscle";
import { Stats_name } from "@shared/models/stats";
import { ObjectUtils_keys } from "@shared/utils/object";
import { CollectionUtils_sort } from "@shared/utils/collection";
import { History_findAllMaxSetsPerId } from "@shared/models/history";
import type { ISettings, IStatsKey } from "@shared/types";
import { GroupHeader } from "@crossplatform/components/GroupHeader";

export function ModalGraphsSheet(): React.ReactElement {
  const state = useStoreState();
  const dispatch = useDispatch();
  const settings = state.storage.settings;
  const stats = state.storage.stats;
  const graphs = settings.graphs.graphs;
  const hasBodyweight = graphs.some((g) => g.id === "weight");

  const maxSets = useMemo(() => History_findAllMaxSetsPerId(state.storage.history), [state.storage.history]);
  const exerciseTypes = useMemo(() => ObjectUtils_keys(maxSets).map(Exercise_fromKey), [maxSets]);

  const availableExercises = useMemo(() => {
    return CollectionUtils_sort(
      exerciseTypes
        .filter((et) => !graphs.some((g) => g.type === "exercise" && g.id === Exercise_toKey(et)))
        .map((et) => Exercise_get(et, settings.exercises)),
      (a, b) => a.name.localeCompare(b.name)
    );
  }, [exerciseTypes, graphs, settings.exercises]);

  const usedStats = graphs.reduce<Set<IStatsKey>>((memo, g) => {
    if (g.type === "statsWeight" || g.type === "statsLength" || g.type === "statsPercentage") {
      memo.add(g.id);
    }
    return memo;
  }, new Set());

  const statsWeightKeys = ObjectUtils_keys(stats.weight).filter(
    (k) => !usedStats.has(k) && (stats.weight[k] || []).length > 0
  );
  const statsLengthKeys = ObjectUtils_keys(stats.length).filter(
    (k) => !usedStats.has(k) && (stats.length[k] || []).length > 0
  );
  const statsPercentageKeys = ObjectUtils_keys(stats.percentage).filter(
    (k) => !usedStats.has(k) && (stats.percentage[k] || []).length > 0
  );

  const availableMuscleGroups = [...Muscle_getAvailableMuscleGroups(settings), "total"].filter(
    (m) => !graphs.some((g) => g.type === "muscleGroup" && g.id === m)
  );

  const hasAvailableStats = statsLengthKeys.length > 0 || statsWeightKeys.length > 0 || statsPercentageKeys.length > 0;

  return (
    <ScrollView className="flex-1 bg-background-default">
      <GroupHeader name="Settings" isExpanded={true}>
        <SettingRow
          label="Default exercise graph type"
          value={settings.graphsSettings.defaultType || "weight"}
          options={["weight", "volume"]}
          onSelect={(v) =>
            updateSettings(
              dispatch,
              lb<ISettings>().p("graphsSettings").p("defaultType").record(v),
              "Set default graph type"
            )
          }
        />
        <SettingRow
          label="Default muscle group type"
          value={settings.graphsSettings.defaultMuscleGroupType || "volume"}
          options={["volume", "sets"]}
          onSelect={(v) =>
            updateSettings(
              dispatch,
              lb<ISettings>().p("graphsSettings").p("defaultMuscleGroupType").record(v),
              "Set muscle group graph type"
            )
          }
        />
        <ToggleRow
          label="Same X axis range for all graphs"
          value={!!settings.graphsSettings.isSameXAxis}
          onToggle={(v) =>
            updateSettings(
              dispatch,
              lb<ISettings>().p("graphsSettings").p("isSameXAxis").record(v),
              "Toggle same X axis"
            )
          }
        />
        {hasBodyweight && (
          <ToggleRow
            label="Add bodyweight to all graphs"
            value={!!settings.graphsSettings.isWithBodyweight}
            onToggle={(v) =>
              updateSettings(
                dispatch,
                lb<ISettings>().p("graphsSettings").p("isWithBodyweight").record(v),
                "Toggle bodyweight"
              )
            }
          />
        )}
        <ToggleRow
          label="Add calculated 1RM to graphs"
          value={!!settings.graphsSettings.isWithOneRm}
          onToggle={(v) =>
            updateSettings(
              dispatch,
              lb<ISettings>().p("graphsSettings").p("isWithOneRm").record(v),
              "Toggle 1RM display"
            )
          }
        />
        <ToggleRow
          label="Add program lines to graphs"
          value={!!settings.graphsSettings.isWithProgramLines}
          onToggle={(v) =>
            updateSettings(
              dispatch,
              lb<ISettings>().p("graphsSettings").p("isWithProgramLines").record(v),
              "Toggle program lines"
            )
          }
        />
      </GroupHeader>

      {graphs.length > 0 && (
        <View className="mt-4 px-4">
          <Text className="text-base font-bold text-text-primary mb-2">Selected Graphs</Text>
          {graphs.map((graph) => (
            <View
              key={`${graph.type}-${graph.id}`}
              className="flex-row justify-between items-center py-3 px-2 border-b border-border-neutral"
            >
              <Text className="text-sm text-text-primary">
                {graph.type === "exercise"
                  ? Exercise_get(Exercise_fromKey(graph.id), settings.exercises).name
                  : graph.type === "muscleGroup"
                    ? `${Muscle_getMuscleGroupName(graph.id, settings)} Weekly Volume`
                    : Stats_name(graph.id)}
              </Text>
              <Pressable onPress={() => EditGraphs_removeGraph(dispatch, graph)}>
                <Text className="text-base text-red-500 px-2">✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {availableExercises.length > 0 && (
        <View className="mt-4 px-4">
          <Text className="text-base font-bold text-text-primary mb-2">Available Exercise Graphs</Text>
          {availableExercises.map((e) => (
            <Pressable
              key={Exercise_toKey(e)}
              className="py-3 px-2 border-b border-border-neutral"
              onPress={() => EditGraphs_addExerciseGraph(dispatch, e)}
            >
              <Text className="text-sm text-text-primary">{e.name}</Text>
              <Text className="text-xs text-text-secondary mt-0.5">{equipmentName(e.equipment)}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {availableMuscleGroups.length > 0 && (
        <View className="mt-4 px-4">
          <Text className="text-base font-bold text-text-primary mb-2">Available Muscle Group Graphs</Text>
          {availableMuscleGroups.map((mg) => (
            <Pressable
              key={mg}
              className="py-3 px-2 border-b border-border-neutral"
              onPress={() => EditGraphs_addMuscleGroupGraph(dispatch, mg)}
            >
              <Text className="text-sm text-text-primary">{Muscle_getMuscleGroupName(mg, settings)} Weekly Volume</Text>
            </Pressable>
          ))}
        </View>
      )}

      {hasAvailableStats && (
        <View className="mt-4 px-4">
          <Text className="text-base font-bold text-text-primary mb-2">Available Stats Graphs</Text>
          {statsWeightKeys.map((k) => (
            <Pressable
              key={k}
              className="py-3 px-2 border-b border-border-neutral"
              onPress={() => EditGraphs_addStatsWeightGraph(dispatch, k)}
            >
              <Text className="text-sm text-text-primary">{Stats_name(k)}</Text>
            </Pressable>
          ))}
          {statsPercentageKeys.map((k) => (
            <Pressable
              key={k}
              className="py-3 px-2 border-b border-border-neutral"
              onPress={() => EditGraphs_addStatsPercentageGraph(dispatch, k)}
            >
              <Text className="text-sm text-text-primary">{Stats_name(k)}</Text>
            </Pressable>
          ))}
          {statsLengthKeys.map((k) => (
            <Pressable
              key={k}
              className="py-3 px-2 border-b border-border-neutral"
              onPress={() => EditGraphs_addStatsLengthGraph(dispatch, k)}
            >
              <Text className="text-sm text-text-primary">{Stats_name(k)}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {!hasAvailableStats && availableExercises.length === 0 && graphs.length === 0 && (
        <View className="p-8 items-center">
          <Text className="text-sm italic text-center text-text-secondary">
            You haven't tracked any workouts or measurements yet.
          </Text>
        </View>
      )}

      <View className="h-10" />
    </ScrollView>
  );
}

function SettingRow<T extends string>(props: {
  label: string;
  value: T;
  options: T[];
  onSelect: (v: T) => void;
}): React.ReactElement {
  return (
    <View className="flex-row justify-between items-center py-3 px-4 border-b border-border-neutral">
      <Text className="text-sm text-text-primary">{props.label}</Text>
      <View className="flex-row gap-1">
        {props.options.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => props.onSelect(opt)}
            className={`px-2.5 py-1.5 rounded-md ${props.value === opt ? "bg-background-neutral" : ""}`}
          >
            <Text className="text-xs text-text-primary">{opt.charAt(0).toUpperCase() + opt.slice(1)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ToggleRow(props: { label: string; value: boolean; onToggle: (v: boolean) => void }): React.ReactElement {
  return (
    <View className="flex-row justify-between items-center py-3 px-4 border-b border-border-neutral">
      <Text className="text-sm text-text-primary flex-1">{props.label}</Text>
      <Switch value={props.value} onValueChange={props.onToggle} />
    </View>
  );
}
