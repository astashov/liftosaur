import { JSX, Fragment } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";

import { equipmentName, Exercise_toKey, Exercise_get, Exercise_fromKey } from "../models/exercise";
import { StringUtils_capitalize, StringUtils_dashcase } from "../utils/string";
import { IDispatch } from "../ducks/types";
import { GroupHeader } from "./groupHeader";
import { DraggableList2 } from "./draggableList2";
import { IconHandle } from "./icons/iconHandle";
import {
  EditGraphs_removeGraph,
  EditGraphs_reorderGraphs,
  EditGraphs_addExerciseGraph,
  EditGraphs_addMuscleGroupGraph,
  EditGraphs_addStatsWeightGraph,
  EditGraphs_addStatsPercentageGraph,
  EditGraphs_addStatsLengthGraph,
} from "../models/editGraphs";
import {
  graphExerciseSelectedTypes,
  IExerciseId,
  IGraph,
  ISettings,
  IStats,
  IStatsKey,
  IGraphExerciseSelectedType,
  graphMuscleGroupSelectedTypes,
  IGraphMuscleGroupSelectedType,
  IExerciseType,
} from "../types";
import { MenuItem } from "./menuItem";
import { Stats_name } from "../models/stats";
import { ObjectUtils_keys } from "../utils/object";
import { MenuItemEditable } from "./menuItemEditable";
import { updateSettings } from "../models/state";
import { lb } from "lens-shmens";
import { IconCloseCircle } from "./icons/iconCloseCircle";
import { ExerciseImage } from "./exerciseImage";
import { CollectionUtils_sort } from "../utils/collection";
import { Muscle_getAvailableMuscleGroups, Muscle_getMuscleGroupName } from "../models/muscle";

interface IModalGraphsProps {
  isHidden: boolean;
  exerciseTypes: IExerciseType[];
  graphs: IGraph[];
  stats: IStats;
  settings: ISettings;
  dispatch: IDispatch;
  onClose: (value?: IExerciseId) => void;
}

export function ModalGraphsContent(props: IModalGraphsProps): JSX.Element {
  const graphs = props.graphs;
  const exercises = CollectionUtils_sort(
    props.exerciseTypes
      .filter((et) => !graphs.some((g) => g.type === "exercise" && g.id === Exercise_toKey(et)))
      .map((et) => Exercise_get(et, props.settings.exercises)),
    (a, b) => a.name.localeCompare(b.name)
  );
  const usedStats = graphs.reduce<Set<IStatsKey>>((memo, g) => {
    if (g.type === "statsWeight" || g.type === "statsLength" || g.type === "statsPercentage") {
      memo.add(g.id);
    }
    return memo;
  }, new Set());
  const settings = props.settings;
  const hasBodyweight = settings.graphs.graphs.some((g) => g.id === "weight");
  const statsWeightKeys = ObjectUtils_keys(props.stats.weight).filter(
    (k) => !usedStats.has(k) && (props.stats.weight[k] || []).length > 0
  );
  const statsLengthKeys = ObjectUtils_keys(props.stats.length).filter(
    (k) => !usedStats.has(k) && (props.stats.length[k] || []).length > 0
  );
  const statsPercentageKeys = ObjectUtils_keys(props.stats.percentage).filter(
    (k) => !usedStats.has(k) && (props.stats.percentage[k] || []).length > 0
  );
  const availableMuscleGroups = [...Muscle_getAvailableMuscleGroups(props.settings), "total"].filter(
    (m) => !graphs.some((g) => g.type === "muscleGroup" && g.id === m)
  );
  const hasAvailableStats = statsLengthKeys.length > 0 || statsWeightKeys.length > 0 || statsPercentageKeys.length > 0;

  return (
    <View className="py-4">
      <GroupHeader name="Settings" isExpanded={true}>
        <MenuItemEditable
          type="select"
          name="Default exercise graph type"
          value={settings.graphsSettings.defaultType || "weight"}
          values={graphExerciseSelectedTypes.map((t) => [t, StringUtils_capitalize(t)])}
          onChange={(v) => {
            if (v) {
              updateSettings(
                props.dispatch,
                lb<ISettings>()
                  .p("graphsSettings")
                  .p("defaultType")
                  .record(v as IGraphExerciseSelectedType),
                "Set default graph type"
              );
            }
          }}
        />
        <MenuItemEditable
          type="select"
          name="Default muscle group graph type"
          value={settings.graphsSettings.defaultMuscleGroupType || "volume"}
          values={graphMuscleGroupSelectedTypes.map((t) => [t, StringUtils_capitalize(t)])}
          onChange={(v) => {
            if (v) {
              updateSettings(
                props.dispatch,
                lb<ISettings>()
                  .p("graphsSettings")
                  .p("defaultMuscleGroupType")
                  .record(v as IGraphMuscleGroupSelectedType),
                "Set muscle group graph type"
              );
            }
          }}
        />
        <MenuItemEditable
          type="boolean"
          name="Same range for X axis for all graphs"
          value={settings.graphsSettings.isSameXAxis ? "true" : "false"}
          onChange={(v) =>
            updateSettings(
              props.dispatch,
              lb<ISettings>()
                .p("graphsSettings")
                .p("isSameXAxis")
                .record(v === "true"),
              "Toggle same X axis"
            )
          }
        />
        {hasBodyweight && (
          <MenuItemEditable
            type="boolean"
            name="Add bodyweight to all graphs"
            value={settings.graphsSettings.isWithBodyweight ? "true" : "false"}
            onChange={(v) =>
              updateSettings(
                props.dispatch,
                lb<ISettings>()
                  .p("graphsSettings")
                  .p("isWithBodyweight")
                  .record(v === "true"),
                "Toggle bodyweight"
              )
            }
          />
        )}
        <MenuItemEditable
          type="boolean"
          name="Add calculated 1RM to graphs"
          value={settings.graphsSettings.isWithOneRm ? "true" : "false"}
          onChange={(v) =>
            updateSettings(
              props.dispatch,
              lb<ISettings>()
                .p("graphsSettings")
                .p("isWithOneRm")
                .record(v === "true"),
              "Toggle 1RM display"
            )
          }
        />
        <MenuItemEditable
          type="boolean"
          name="Add program lines to graphs"
          value={settings.graphsSettings.isWithProgramLines ? "true" : "false"}
          onChange={(v) =>
            updateSettings(
              props.dispatch,
              lb<ISettings>()
                .p("graphsSettings")
                .p("isWithProgramLines")
                .record(v === "true"),
              "Toggle program lines"
            )
          }
        />
      </GroupHeader>
      <View className="relative" data-cy="modal-graphs" data-testid="modal-graphs" testID="modal-graphs">
        {graphs.length > 0 && <GroupHeader topPadding={true} name="Selected Graphs" />}
        <DraggableList2
          items={graphs}
          element={(graph, i, handle) => {
            return (
              <View
                data-cy={`item-graph-${graph.type}-${StringUtils_dashcase(graph.id)}`} data-testid={`item-graph-${graph.type}-${StringUtils_dashcase(graph.id)}`}
                testID={`item-graph-${graph.type}-${StringUtils_dashcase(graph.id)}`}
                className="w-full px-2 py-1 border-b border-border-neutral"
              >
                <View className="flex-row items-center">
                  <View style={{ marginLeft: -16 }}>
                    {handle(
                      <View className="p-2">
                        <IconHandle />
                      </View>
                    )}
                  </View>
                  {graph.type === "exercise" ? (
                    <ExercisePreview exerciseKey={graph.id} settings={props.settings} />
                  ) : graph.type === "muscleGroup" ? (
                    <MuscleGroupPreview muscleGroup={graph.id} settings={props.settings} />
                  ) : (
                    <StatsPreview stats={graph.id} />
                  )}
                  <Pressable
                    data-cy="remove-graph" data-testid="remove-graph"
                    testID="remove-graph"
                    className="p-1 nm-remove-graph"
                    onPress={() => EditGraphs_removeGraph(props.dispatch, graph)}
                  >
                    <IconCloseCircle />
                  </Pressable>
                </View>
              </View>
            );
          }}
          onDragEnd={(startIndex, endIndex) => {
            if (startIndex !== endIndex) {
              EditGraphs_reorderGraphs(props.dispatch, startIndex, endIndex);
            }
          }}
        />
        {exercises.length > 0 && (
          <>
            <GroupHeader topPadding={true} name="Available Exercise Graphs" />
            {exercises.map((e) => {
              return (
                <Pressable
                  key={Exercise_toKey(e)}
                  data-cy={`item-graph-${StringUtils_dashcase(e.name)}`} data-testid={`item-graph-${StringUtils_dashcase(e.name)}`}
                  testID={`item-graph-${StringUtils_dashcase(e.name)}`}
                  className="flex-row w-full px-2 py-1 border-b border-border-neutral"
                  onPress={() => EditGraphs_addExerciseGraph(props.dispatch, e)}
                >
                  <ExercisePreview exerciseKey={Exercise_toKey(e)} settings={props.settings} />
                </Pressable>
              );
            })}
          </>
        )}
        {availableMuscleGroups.length > 0 && (
          <>
            <GroupHeader name="Available Muscle Groups Graphs" topPadding={true} />
            {availableMuscleGroups.map((muscleGroup) => {
              return (
                <Pressable
                  key={muscleGroup}
                  data-cy={`item-graph-${muscleGroup}`} data-testid={`item-graph-${muscleGroup}`}
                  testID={`item-graph-${muscleGroup}`}
                  className="flex-row w-full px-2 py-1 border-b border-border-neutral"
                  onPress={() => EditGraphs_addMuscleGroupGraph(props.dispatch, muscleGroup)}
                >
                  <MuscleGroupPreview muscleGroup={muscleGroup} settings={props.settings} />
                </Pressable>
              );
            })}
          </>
        )}
        {hasAvailableStats && <GroupHeader name="Available Stats Graphs" topPadding={true} />}
        {statsWeightKeys.map((statsKey) => {
          return (
            <MenuItem
              key={statsKey}
              name={Stats_name(statsKey)}
              onClick={() => EditGraphs_addStatsWeightGraph(props.dispatch, statsKey)}
            />
          );
        })}
        {statsPercentageKeys.map((statsKey) => {
          return (
            <MenuItem
              key={statsKey}
              name={Stats_name(statsKey)}
              onClick={() => EditGraphs_addStatsPercentageGraph(props.dispatch, statsKey)}
            />
          );
        })}
        {statsLengthKeys.map((statsKey) => {
          return (
            <MenuItem
              key={statsKey}
              name={Stats_name(statsKey)}
              onClick={() => EditGraphs_addStatsLengthGraph(props.dispatch, statsKey)}
            />
          );
        })}
        {!hasAvailableStats && exercises.length === 0 && graphs.length === 0 && (
          <Text className="mt-3 text-base italic text-text-secondary">
            You haven't tracked any workouts or measurements yet.
          </Text>
        )}
      </View>
    </View>
  );
}

function ExercisePreview(props: { exerciseKey: string; settings: ISettings }): JSX.Element {
  const e = Exercise_get(Exercise_fromKey(props.exerciseKey), props.settings.exercises);
  return (
    <Fragment>
      <View className="pr-4" style={{ width: 48, minHeight: 32 }}>
        <ExerciseImage settings={props.settings} className="w-full" exerciseType={e} size="small" />
      </View>
      <View className="flex-1 py-2">
        <Text className="text-text-primary">{e.name}</Text>
        <Text className="text-xs text-text-secondary">{equipmentName(e.equipment)}</Text>
      </View>
    </Fragment>
  );
}

function StatsPreview(props: { stats: IStatsKey }): JSX.Element {
  return (
    <View className="flex-1 py-3">
      <Text className="text-sm">{Stats_name(props.stats)}</Text>
    </View>
  );
}

function MuscleGroupPreview(props: { muscleGroup: string; settings: ISettings }): JSX.Element {
  return (
    <View className="flex-1 py-3">
      <Text className="text-sm">{Muscle_getMuscleGroupName(props.muscleGroup, props.settings)} Weekly Volume</Text>
    </View>
  );
}
