import { h, JSX, Fragment } from "preact";
import { Modal } from "./modal";
import { Exercise } from "../models/exercise";
import { StringUtils } from "../utils/string";
import { IDispatch } from "../ducks/types";
import { GroupHeader } from "./groupHeader";
import { DraggableList } from "./draggableList";
import { IconHandle } from "./icons/iconHandle";
import { EditGraphs } from "../models/editGraphs";
import { IExerciseId, IGraph, ISettings, IStats, IStatsKey } from "../types";
import { MenuItem } from "./menuItem";
import { Stats } from "../models/stats";
import { ObjectUtils } from "../utils/object";
import { MenuItemEditable } from "./menuItemEditable";
import { updateSettings } from "../models/state";
import { lb } from "lens-shmens";
import { IconCloseCircle } from "./icons/iconCloseCircle";

interface IModalGraphsProps {
  isHidden: boolean;
  exerciseIds: IExerciseId[];
  graphs: IGraph[];
  stats: IStats;
  settings: ISettings;
  dispatch: IDispatch;
  onClose: (value?: IExerciseId) => void;
}

export function ModalGraphs(props: IModalGraphsProps): JSX.Element {
  const graphs = props.graphs;
  const exercises = Exercise.getByIds(
    props.exerciseIds.filter((e) => props.graphs.every((g) => g.id !== e)),
    props.settings.exercises
  );
  const usedStats = graphs.reduce<Set<IStatsKey>>((memo, g) => {
    if (g.type === "statsWeight" || g.type === "statsLength") {
      memo.add(g.id);
    }
    return memo;
  }, new Set());
  const settings = props.settings;
  const hasBodyweight = settings.graphs.some((g) => g.id === "weight");
  const statsWeightKeys = ObjectUtils.keys(props.stats.weight).filter((k) => !usedStats.has(k));
  const statsLengthKeys = ObjectUtils.keys(props.stats.length).filter((k) => !usedStats.has(k));
  return (
    <Modal isHidden={props.isHidden} shouldShowClose={true} onClose={props.onClose} isFullWidth>
      <GroupHeader name="Settings" isExpanded={true}>
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
      </GroupHeader>
      <form className="relative" data-cy="modal-graphs" onSubmit={(e) => e.preventDefault()}>
        {graphs.length > 0 && <GroupHeader name="Selected Graphs" />}
        <DraggableList
          items={graphs}
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
                    <ExercisePreview exercise={graph.id} settings={props.settings} />
                  ) : (
                    <StatsPreview stats={graph.id} />
                  )}
                  <div>
                    <button
                      data-cy="remove-graph"
                      className="align-middle"
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
        <GroupHeader name="Available Exercise Graphs" />
        {exercises.map((e) => {
          return (
            <section
              data-cy={`item-graph-${StringUtils.dashcase(e.name)}`}
              className="flex w-full px-2 py-1 text-left border-b border-gray-200"
              onClick={() => EditGraphs.addExerciseGraph(props.dispatch, e)}
            >
              <ExercisePreview exercise={e.id} settings={props.settings} />
            </section>
          );
        })}
        <GroupHeader name="Available Stats Graphs" />
        {statsWeightKeys.map((statsKey) => {
          return (
            <MenuItem
              name={Stats.name(statsKey)}
              onClick={() => EditGraphs.addStatsWeightGraph(props.dispatch, statsKey)}
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
      </form>
    </Modal>
  );
}

function ExercisePreview(props: { exercise: IExerciseId; settings: ISettings }): JSX.Element {
  const e = Exercise.getById(props.exercise, props.settings.exercises);
  const equipment = Exercise.defaultEquipment(e.id, props.settings.exercises);
  return (
    <Fragment>
      <div className="w-12 pr-4">
        {equipment && (
          <img
            src={`https://www.liftosaur.com/externalimages/exercises/single/small/${e.id.toLowerCase()}_${equipment.toLowerCase()}_single_small.png`}
            alt={`${e.name} image`}
          />
        )}
      </div>
      <div className="flex items-center flex-1 py-2 text-left">{e.name}</div>
    </Fragment>
  );
}

function StatsPreview(props: { stats: IStatsKey }): JSX.Element {
  return (
    <Fragment>
      <div className="flex items-center flex-1 py-3 text-left">{Stats.name(props.stats)}</div>
    </Fragment>
  );
}
