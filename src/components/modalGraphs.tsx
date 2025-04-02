import { h, JSX, Fragment } from "preact";
import { Modal } from "./modal";
import { Exercise, equipmentName } from "../models/exercise";
import { StringUtils } from "../utils/string";
import { IDispatch } from "../ducks/types";
import { GroupHeader } from "./groupHeader";
import { DraggableList } from "./draggableList";
import { IconHandle } from "./icons/iconHandle";
import { EditGraphs } from "../models/editGraphs";
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
  screenMuscles,
} from "../types";
import { MenuItem } from "./menuItem";
import { Stats } from "../models/stats";
import { ObjectUtils } from "../utils/object";
import { MenuItemEditable } from "./menuItemEditable";
import { updateSettings } from "../models/state";
import { lb } from "lens-shmens";
import { IconCloseCircle } from "./icons/iconCloseCircle";
import { ExerciseImage } from "./exerciseImage";
import { CollectionUtils } from "../utils/collection";

interface IModalGraphsProps {
  isHidden: boolean;
  exerciseTypes: IExerciseType[];
  graphs: IGraph[];
  stats: IStats;
  settings: ISettings;
  dispatch: IDispatch;
  onClose: (value?: IExerciseId) => void;
}

export function ModalGraphs(props: IModalGraphsProps): JSX.Element {
  const graphs = props.graphs;
  const exercises = CollectionUtils.sort(
    props.exerciseTypes
      .filter((et) => !graphs.some((g) => g.type === "exercise" && g.id === Exercise.toKey(et)))
      .map((et) => Exercise.get(et, props.settings.exercises)),
    (a, b) => a.name.localeCompare(b.name)
  );
  const usedStats = graphs.reduce<Set<IStatsKey>>((memo, g) => {
    if (g.type === "statsWeight" || g.type === "statsLength" || g.type === "statsPercentage") {
      memo.add(g.id);
    }
    return memo;
  }, new Set());
  const settings = props.settings;
  const hasBodyweight = settings.graphs.some((g) => g.id === "weight");
  const statsWeightKeys = ObjectUtils.keys(props.stats.weight).filter(
    (k) => !usedStats.has(k) && (props.stats.weight[k] || []).length > 0
  );
  const statsLengthKeys = ObjectUtils.keys(props.stats.length).filter(
    (k) => !usedStats.has(k) && (props.stats.length[k] || []).length > 0
  );
  const statsPercentageKeys = ObjectUtils.keys(props.stats.percentage).filter(
    (k) => !usedStats.has(k) && (props.stats.percentage[k] || []).length > 0
  );
  const availableMuscleGroups = [...screenMuscles, "total"].filter(
    (m) => !graphs.some((g) => g.type === "muscleGroup" && g.id === m)
  );
  const hasAvailableStats = statsLengthKeys.length > 0 || statsWeightKeys.length > 0 || statsPercentageKeys.length > 0;

  return (
    <Modal isHidden={props.isHidden} shouldShowClose={true} onClose={props.onClose} isFullWidth>
      <GroupHeader name="Settings" isExpanded={true}>
        <MenuItemEditable
          type="select"
          name="Default exercise graph type"
          value={settings.graphsSettings.defaultType || "weight"}
          values={graphExerciseSelectedTypes.map((t) => [t, StringUtils.capitalize(t)])}
          onChange={(v) => {
            if (v) {
              updateSettings(
                props.dispatch,
                lb<ISettings>()
                  .p("graphsSettings")
                  .p("defaultType")
                  .record(v as IGraphExerciseSelectedType)
              );
            }
          }}
        />
        <MenuItemEditable
          type="select"
          name="Default muscle group graph type"
          value={settings.graphsSettings.defaultMuscleGroupType || "volume"}
          values={graphMuscleGroupSelectedTypes.map((t) => [t, StringUtils.capitalize(t)])}
          onChange={(v) => {
            if (v) {
              updateSettings(
                props.dispatch,
                lb<ISettings>()
                  .p("graphsSettings")
                  .p("defaultMuscleGroupType")
                  .record(v as IGraphMuscleGroupSelectedType)
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
                .record(v === "true")
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
                  .record(v === "true")
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
                .record(v === "true")
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
                .record(v === "true")
            )
          }
        />
      </GroupHeader>
      <form className="relative" data-cy="modal-graphs" onSubmit={(e) => e.preventDefault()}>
        {graphs.length > 0 && <GroupHeader topPadding={true} name="Selected Graphs" />}
        <DraggableList
          items={graphs}
          mode="vertical"
          element={(graph, i, handleTouchStart) => {
            return (
              <section
                data-cy={`item-graph-${graph.type}-${StringUtils.dashcase(graph.id)}`}
                className="w-full px-2 py-1 text-left border-b border-gray-200"
              >
                <section className="flex items-center">
                  <div className="p-2 cursor-move" style={{ marginLeft: "-16px", touchAction: "none" }}>
                    <span onMouseDown={handleTouchStart} onTouchStart={handleTouchStart}>
                      <IconHandle />
                    </span>
                  </div>
                  {graph.type === "exercise" ? (
                    <ExercisePreview exerciseKey={graph.id} settings={props.settings} />
                  ) : graph.type === "muscleGroup" ? (
                    <MuscleGroupPreview muscleGroup={graph.id} />
                  ) : (
                    <StatsPreview stats={graph.id} />
                  )}
                  <div>
                    <button
                      data-cy="remove-graph"
                      className="align-middle nm-remove-graph"
                      onClick={() => EditGraphs.removeGraph(props.dispatch, graph)}
                    >
                      <IconCloseCircle />
                    </button>
                  </div>
                </section>
              </section>
            );
          }}
          onDragEnd={(startIndex, endIndex) => EditGraphs.reorderGraphs(props.dispatch, startIndex, endIndex)}
        />
        {exercises.length > 0 && (
          <>
            <GroupHeader topPadding={true} name="Available Exercise Graphs" />
            {exercises.map((e) => {
              return (
                <section
                  data-cy={`item-graph-${StringUtils.dashcase(e.name)}`}
                  className="flex w-full px-2 py-1 text-left border-b border-gray-200"
                  onClick={() => EditGraphs.addExerciseGraph(props.dispatch, e)}
                >
                  <ExercisePreview exerciseKey={Exercise.toKey(e)} settings={props.settings} />
                </section>
              );
            })}
          </>
        )}
        {availableMuscleGroups.length > 0 && (
          <>
            <GroupHeader name="Available Muscle Groups Graphs" topPadding={true} />
            {availableMuscleGroups.map((muscleGroup) => {
              return (
                <section
                  data-cy={`item-graph-${muscleGroup}`}
                  className="flex w-full px-2 py-1 text-left border-b border-gray-200"
                  onClick={() => EditGraphs.addMuscleGroupGraph(props.dispatch, muscleGroup)}
                >
                  <MuscleGroupPreview muscleGroup={muscleGroup} />
                </section>
              );
            })}
          </>
        )}
        {hasAvailableStats && <GroupHeader name="Available Stats Graphs" topPadding={true} />}
        {statsWeightKeys.map((statsKey) => {
          return (
            <MenuItem
              name={Stats.name(statsKey)}
              onClick={() => EditGraphs.addStatsWeightGraph(props.dispatch, statsKey)}
            />
          );
        })}
        {statsPercentageKeys.map((statsKey) => {
          return (
            <MenuItem
              name={Stats.name(statsKey)}
              onClick={() => EditGraphs.addStatsPercentageGraph(props.dispatch, statsKey)}
            />
          );
        })}
        {statsLengthKeys.map((statsKey) => {
          return (
            <MenuItem
              name={Stats.name(statsKey)}
              onClick={() => EditGraphs.addStatsLengthGraph(props.dispatch, statsKey)}
            />
          );
        })}
        {!hasAvailableStats && exercises.length === 0 && graphs.length === 0 && (
          <div className="mt-3 text-base italic text-gray-500">
            You haven't tracked any workouts or measurements yet.
          </div>
        )}
      </form>
    </Modal>
  );
}

function ExercisePreview(props: { exerciseKey: string; settings: ISettings }): JSX.Element {
  const e = Exercise.get(Exercise.fromKey(props.exerciseKey), props.settings.exercises);
  return (
    <Fragment>
      <div className="w-12 pr-4" style={{ minHeight: "2rem" }}>
        <ExerciseImage settings={props.settings} className="w-full" exerciseType={e} size="small" />
      </div>
      <div className="flex items-center flex-1 py-2 text-left">
        <div>
          <div>{e.name}</div>
          <div className="text-xs text-grayv2-main">{equipmentName(e.equipment)}</div>
        </div>
      </div>
    </Fragment>
  );
}

function StatsPreview(props: { stats: IStatsKey }): JSX.Element {
  return (
    <Fragment>
      <div className="flex items-center flex-1 py-3 text-sm text-left">{Stats.name(props.stats)}</div>
    </Fragment>
  );
}

function MuscleGroupPreview(props: { muscleGroup: string }): JSX.Element {
  return (
    <Fragment>
      <div className="flex items-center flex-1 py-3 text-sm text-left">
        {StringUtils.capitalize(props.muscleGroup)} Weekly Volume
      </div>
    </Fragment>
  );
}
