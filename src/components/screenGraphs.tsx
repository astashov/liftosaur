import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { GraphExercise } from "./graphExercise";
import { History } from "../models/history";
import { useState } from "preact/hooks";
import { ModalGraphs } from "./modalGraphs";
import { ObjectUtils } from "../utils/object";
import { ISettings, IHistoryRecord, IStats, IScreenMuscle } from "../types";
import { getLengthDataForGraph, getPercentageDataForGraph, getWeightDataForGraph, GraphStats } from "./graphStats";
import { INavCommon } from "../models/state";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { IconFilter } from "./icons/iconFilter";
import { HelpGraphs } from "./help/helpGraphs";
import { Collector } from "../utils/collector";
import { GraphMuscleGroup } from "./graphMuscleGroup";
import { CollectionUtils } from "../utils/collection";
import { Exercise } from "../models/exercise";

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
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const maxSets = History.findAllMaxSetsPerId(props.history);
  const exerciseTypes = ObjectUtils.keys(maxSets).map(Exercise.fromKey);
  const hasBodyweight = props.settings.graphs.some((g) => g.id === "weight");
  let bodyweightData: [number, number][] = [];

  const historyCollector = Collector.build(CollectionUtils.sortBy(props.history, "id"))
    .addFn(History.collectMuscleGroups(props.settings))
    .addFn(History.collectProgramChangeTimes());
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
    for (const key of ObjectUtils.keys(props.stats.weight)) {
      for (const value of props.stats.weight[key] || []) {
        if (minX > value.timestamp) {
          minX = value.timestamp;
        }
        if (maxX < value.timestamp) {
          maxX = value.timestamp;
        }
      }
    }
    for (const key of ObjectUtils.keys(props.stats.length)) {
      for (const value of props.stats.length[key] || []) {
        if (minX > value.timestamp) {
          minX = value.timestamp;
        } else if (maxX < value.timestamp) {
          maxX = value.timestamp;
        }
      }
    }
  }

  return (
    <Surface
      navbar={
        <NavbarView
          navCommon={props.navCommon}
          dispatch={props.dispatch}
          helpContent={<HelpGraphs />}
          rightButtons={[
            <button
              data-cy="graphs-modify"
              className="p-2 nm-graphs-navbar-filter"
              onClick={() => setIsModalOpen(true)}
            >
              <IconFilter />
            </button>,
          ]}
          title="Graphs"
        />
      }
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
      addons={
        <ModalGraphs
          settings={props.settings}
          isHidden={!isModalOpen}
          exerciseTypes={exerciseTypes}
          stats={props.stats}
          graphs={props.settings.graphs}
          onClose={() => setIsModalOpen(false)}
          dispatch={props.dispatch}
        />
      }
    >
      {props.settings.graphs.length === 0 ? (
        <div className="p-8 text-2xl font-bold text-center text-gray-600">
          Select graphs you want to display by tapping <IconFilter /> icon at right top corner.
        </div>
      ) : (
        <section className="pb-4">
          {props.settings.graphs.map((graph) => {
            if (graph.type === "exercise") {
              return (
                <div className="mb-2">
                  <GraphExercise
                    initialType={props.settings.graphsSettings.defaultType}
                    isSameXAxis={isSameXAxis}
                    minX={Math.round(minX / 1000)}
                    maxX={Math.round(maxX / 1000)}
                    bodyweightData={hasBodyweight && isWithBodyweight ? bodyweightData : undefined}
                    isWithOneRm={isWithOneRm}
                    key={`${graph.id}_${isSameXAxis}_${isWithBodyweight}_${isWithOneRm}_${isWithProgramLines}`}
                    settings={props.settings}
                    isWithProgramLines={isWithProgramLines}
                    history={props.history}
                    exercise={Exercise.fromKey(graph.id)}
                    dispatch={props.dispatch}
                  />
                </div>
              );
            } else if (graph.type === "statsWeight") {
              const collection = getWeightDataForGraph(props.stats.weight[graph.id] || [], props.settings);
              return (
                <div className="mb-2">
                  <GraphStats
                    isSameXAxis={isSameXAxis}
                    minX={Math.round(minX / 1000)}
                    maxX={Math.round(maxX / 1000)}
                    units={props.settings.units}
                    key={`${graph.id}_${isSameXAxis}`}
                    settings={props.settings}
                    collection={collection}
                    statsKey={graph.id}
                  />
                </div>
              );
            } else if (graph.type === "statsLength") {
              const collection = getLengthDataForGraph(props.stats.length[graph.id] || [], props.settings);
              return (
                <div className="mb-2">
                  <GraphStats
                    isSameXAxis={isSameXAxis}
                    minX={Math.round(minX / 1000)}
                    maxX={Math.round(maxX / 1000)}
                    units={props.settings.lengthUnits}
                    key={graph.id}
                    settings={props.settings}
                    collection={collection}
                    statsKey={graph.id}
                  />
                </div>
              );
            } else if (graph.type === "muscleGroup") {
              const muscleGroup = graph.id as IScreenMuscle | "total";
              return (
                <GraphMuscleGroup
                  initialType={props.settings.graphsSettings.defaultMuscleGroupType}
                  programChangeTimes={isWithProgramLines ? programChangeTimes.changeProgramTimes : undefined}
                  data={muscleGroupsData[muscleGroup]}
                  muscleGroup={muscleGroup}
                  settings={props.settings}
                />
              );
            } else {
              const collection = getPercentageDataForGraph(props.stats.percentage[graph.id] || [], props.settings);
              return (
                <div className="mb-2">
                  <GraphStats
                    isSameXAxis={isSameXAxis}
                    minX={Math.round(minX / 1000)}
                    maxX={Math.round(maxX / 1000)}
                    units="%"
                    key={graph.id}
                    settings={props.settings}
                    collection={collection}
                    statsKey={graph.id}
                  />
                </div>
              );
            }
          })}
        </section>
      )}
    </Surface>
  );
}
