import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable, Switch, StyleSheet } from "react-native";
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
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";
import type { ISettings, IStatsKey } from "@shared/types";
import { GroupHeader } from "@crossplatform/components/GroupHeader";

export function ModalGraphsSheet(): React.ReactElement {
  const state = useStoreState();
  const dispatch = useDispatch();
  const sem = Tailwind_semantic();
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

  const usedStats = useMemo(() => {
    return graphs.reduce<Set<IStatsKey>>((memo, g) => {
      if (g.type === "statsWeight" || g.type === "statsLength" || g.type === "statsPercentage") {
        memo.add(g.id);
      }
      return memo;
    }, new Set());
  }, [graphs]);

  const statsWeightKeys = ObjectUtils_keys(stats.weight).filter(
    (k) => !usedStats.has(k) && (stats.weight[k] || []).length > 0
  );
  const statsLengthKeys = ObjectUtils_keys(stats.length).filter(
    (k) => !usedStats.has(k) && (stats.length[k] || []).length > 0
  );
  const statsPercentageKeys = ObjectUtils_keys(stats.percentage).filter(
    (k) => !usedStats.has(k) && (stats.percentage[k] || []).length > 0
  );

  const availableMuscleGroups = useMemo(() => {
    return [...Muscle_getAvailableMuscleGroups(settings), "total"].filter(
      (m) => !graphs.some((g) => g.type === "muscleGroup" && g.id === m)
    );
  }, [settings, graphs]);

  const hasAvailableStats = statsLengthKeys.length > 0 || statsWeightKeys.length > 0 || statsPercentageKeys.length > 0;

  return (
    <ScrollView style={[styles.root, { backgroundColor: sem.background.default }]}>
      <GroupHeader name="Settings" isExpanded={true}>
        <SettingRow
          label="Default exercise graph type"
          value={settings.graphsSettings.defaultType || "weight"}
          options={["weight", "volume"]}
          sem={sem}
          onSelect={(v) =>
            updateSettings(
              dispatch,
              lb<ISettings>()
                .p("graphsSettings")
                .p("defaultType")
                .record(v as any),
              "Set default graph type"
            )
          }
        />
        <SettingRow
          label="Default muscle group type"
          value={settings.graphsSettings.defaultMuscleGroupType || "volume"}
          options={["volume", "sets"]}
          sem={sem}
          onSelect={(v) =>
            updateSettings(
              dispatch,
              lb<ISettings>()
                .p("graphsSettings")
                .p("defaultMuscleGroupType")
                .record(v as any),
              "Set muscle group graph type"
            )
          }
        />
        <ToggleRow
          label="Same X axis range for all graphs"
          value={!!settings.graphsSettings.isSameXAxis}
          sem={sem}
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
            sem={sem}
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
          sem={sem}
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
          sem={sem}
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
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: sem.text.primary }]}>Selected Graphs</Text>
          {graphs.map((graph, i) => (
            <View key={`${graph.type}-${graph.id}`} style={[styles.row, { borderBottomColor: sem.border.neutral }]}>
              <Text style={[styles.rowText, { color: sem.text.primary }]}>
                {graph.type === "exercise"
                  ? Exercise_get(Exercise_fromKey(graph.id), settings.exercises).name
                  : graph.type === "muscleGroup"
                    ? `${Muscle_getMuscleGroupName(graph.id, settings)} Weekly Volume`
                    : Stats_name(graph.id)}
              </Text>
              <Pressable onPress={() => EditGraphs_removeGraph(dispatch, graph)}>
                <Text style={styles.removeBtn}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {availableExercises.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: sem.text.primary }]}>Available Exercise Graphs</Text>
          {availableExercises.map((e) => (
            <Pressable
              key={Exercise_toKey(e)}
              style={[styles.row, { borderBottomColor: sem.border.neutral }]}
              onPress={() => EditGraphs_addExerciseGraph(dispatch, e)}
            >
              <View>
                <Text style={[styles.rowText, { color: sem.text.primary }]}>{e.name}</Text>
                <Text style={[styles.rowSubtext, { color: sem.text.secondary }]}>{equipmentName(e.equipment)}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {availableMuscleGroups.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: sem.text.primary }]}>Available Muscle Group Graphs</Text>
          {availableMuscleGroups.map((mg) => (
            <Pressable
              key={mg}
              style={[styles.row, { borderBottomColor: sem.border.neutral }]}
              onPress={() => EditGraphs_addMuscleGroupGraph(dispatch, mg)}
            >
              <Text style={[styles.rowText, { color: sem.text.primary }]}>
                {Muscle_getMuscleGroupName(mg, settings)} Weekly Volume
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {hasAvailableStats && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: sem.text.primary }]}>Available Stats Graphs</Text>
          {statsWeightKeys.map((k) => (
            <Pressable
              key={k}
              style={[styles.row, { borderBottomColor: sem.border.neutral }]}
              onPress={() => EditGraphs_addStatsWeightGraph(dispatch, k)}
            >
              <Text style={[styles.rowText, { color: sem.text.primary }]}>{Stats_name(k)}</Text>
            </Pressable>
          ))}
          {statsPercentageKeys.map((k) => (
            <Pressable
              key={k}
              style={[styles.row, { borderBottomColor: sem.border.neutral }]}
              onPress={() => EditGraphs_addStatsPercentageGraph(dispatch, k)}
            >
              <Text style={[styles.rowText, { color: sem.text.primary }]}>{Stats_name(k)}</Text>
            </Pressable>
          ))}
          {statsLengthKeys.map((k) => (
            <Pressable
              key={k}
              style={[styles.row, { borderBottomColor: sem.border.neutral }]}
              onPress={() => EditGraphs_addStatsLengthGraph(dispatch, k)}
            >
              <Text style={[styles.rowText, { color: sem.text.primary }]}>{Stats_name(k)}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {!hasAvailableStats && availableExercises.length === 0 && graphs.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: sem.text.secondary }]}>
            You haven't tracked any workouts or measurements yet.
          </Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function SettingRow(props: {
  label: string;
  value: string;
  options: string[];
  sem: ReturnType<typeof Tailwind_semantic>;
  onSelect: (v: string) => void;
}): React.ReactElement {
  return (
    <View style={[styles.settingRow, { borderBottomColor: props.sem.border.neutral }]}>
      <Text style={[styles.settingLabel, { color: props.sem.text.primary }]}>{props.label}</Text>
      <View style={styles.optionsRow}>
        {props.options.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => props.onSelect(opt)}
            style={[styles.optionBtn, props.value === opt && { backgroundColor: props.sem.background.neutral }]}
          >
            <Text style={[styles.optionText, { color: props.sem.text.primary }]}>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ToggleRow(props: {
  label: string;
  value: boolean;
  sem: ReturnType<typeof Tailwind_semantic>;
  onToggle: (v: boolean) => void;
}): React.ReactElement {
  return (
    <View style={[styles.settingRow, { borderBottomColor: props.sem.border.neutral }]}>
      <Text style={[styles.settingLabel, { color: props.sem.text.primary, flex: 1 }]}>{props.label}</Text>
      <Switch value={props.value} onValueChange={props.onToggle} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  rowText: {
    fontSize: 14,
  },
  rowSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  removeBtn: {
    fontSize: 16,
    color: "#ef4444",
    paddingHorizontal: 8,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingLabel: {
    fontSize: 14,
  },
  optionsRow: {
    flexDirection: "row",
    gap: 4,
  },
  optionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  optionText: {
    fontSize: 13,
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    fontStyle: "italic",
    textAlign: "center",
  },
});
