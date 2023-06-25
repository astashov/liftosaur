import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { GraphExercise } from "./graphExercise";
import { History } from "../models/history";
import { useState } from "preact/hooks";
import { ModalGraphs } from "./modalGraphs";
import { ObjectUtils } from "../utils/object";
import { ISettings, IHistoryRecord, IExerciseId, IEquipment, IStats } from "../types";
import { getLengthDataForGraph, getPercentageDataForGraph, getWeightDataForGraph, GraphStats } from "./graphStats";
import { ILoading } from "../models/state";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { IScreen, Screen } from "../models/screen";
import { IconFilter } from "./icons/iconFilter";
import { HelpGraphs } from "./help/helpGraphs";

interface IProps {
  dispatch: IDispatch;
  loading: ILoading;
  settings: ISettings;
  screenStack: IScreen[];
  stats: IStats;
  history: IHistoryRecord[];
}

export function ScreenGraphs(props: IProps): JSX.Element {
  const { settings } = props;
  const { isWithBodyweight, isSameXAxis, isWithOneRm, isWithProgramLines } = settings.graphsSettings;
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const maxSets = History.findAllMaxSetsPerId(props.history);
  const exerciseIds = ObjectUtils.keys(maxSets);
  const hasBodyweight = props.settings.graphs.some((g) => g.id === "weight");
  let bodyweightData: [number, number][] = [];
  if (hasBodyweight && isWithBodyweight) {
    bodyweightData = getWeightDataForGraph(props.stats.weight.weight || [], props.settings);
  }
  let maxX = 0;
  let minX = Infinity;
  const exerciseTypes = props.history.reduce<Partial<Record<IExerciseId, IEquipment>>>((memo, hr) => {
    for (const entry of hr.entries) {
      if (exerciseIds.indexOf(entry.exercise.id)) {
        if (maxX < hr.startTime) {
          maxX = hr.startTime;
        }
        if (minX > hr.startTime) {
          minX = hr.startTime;
        }
        memo[entry.exercise.id] = entry.exercise.equipment;
      }
    }
    return memo;
  }, {});
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
          loading={props.loading}
          dispatch={props.dispatch}
          helpContent={<HelpGraphs />}
          rightButtons={[
            <button data-cy="graphs-modify" className="p-2" onClick={() => setIsModalOpen(true)}>
              <IconFilter />
            </button>,
          ]}
          screenStack={props.screenStack}
          title="Graphs"
        />
      }
      footer={<Footer2View dispatch={props.dispatch} screen={Screen.current(props.screenStack)} />}
      addons={
        <ModalGraphs
          settings={props.settings}
          isHidden={!isModalOpen}
          exerciseIds={exerciseIds}
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
                    isSameXAxis={isSameXAxis}
                    minX={Math.round(minX / 1000)}
                    maxX={Math.round(maxX / 1000)}
                    bodyweightData={hasBodyweight && isWithBodyweight ? bodyweightData : undefined}
                    isWithOneRm={isWithOneRm}
                    key={`${graph.id}_${isSameXAxis}_${isWithBodyweight}_${isWithOneRm}_${isWithProgramLines}`}
                    settings={props.settings}
                    isWithProgramLines={isWithProgramLines}
                    history={props.history}
                    exercise={{ id: graph.id, equipment: exerciseTypes[graph.id] }}
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
                    minX={minX}
                    maxX={maxX}
                    units={props.settings.lengthUnits}
                    key={graph.id}
                    settings={props.settings}
                    collection={collection}
                    statsKey={graph.id}
                  />
                </div>
              );
            } else {
              const collection = getPercentageDataForGraph(props.stats.percentage[graph.id] || [], props.settings);
              return (
                <div className="mb-2">
                  <GraphStats
                    isSameXAxis={isSameXAxis}
                    minX={minX}
                    maxX={maxX}
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
