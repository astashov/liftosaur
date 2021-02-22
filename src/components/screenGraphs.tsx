import { h, JSX } from "preact";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { IDispatch } from "../ducks/types";
import { GraphExercise } from "./graphExercise";
import { History } from "../models/history";
import { Thunk } from "../ducks/thunks";
import { useState } from "preact/hooks";
import { ModalGraphs } from "./modalGraphs";
import { ObjectUtils } from "../utils/object";
import { ISettings, IHistoryRecord, IExerciseId, IEquipment, IStats } from "../types";
import { getLengthDataForGraph, getWeightDataForGraph, GraphStats } from "./graphStats";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  stats: IStats;
  history: IHistoryRecord[];
}

export function ScreenGraphs(props: IProps): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const maxSets = History.findAllMaxSets(props.history);
  const exerciseIds = ObjectUtils.keys(maxSets);
  const exerciseTypes = props.history.reduce<Partial<Record<IExerciseId, IEquipment>>>((memo, hr) => {
    for (const entry of hr.entries) {
      if (exerciseIds.indexOf(entry.exercise.id)) {
        memo[entry.exercise.id] = entry.exercise.equipment;
      }
    }
    return memo;
  }, {});

  return (
    <section className="h-full">
      <HeaderView
        title="Graphs"
        left={
          <button data-cy="graphs-back" onClick={() => props.dispatch(Thunk.pullScreen())}>
            Back
          </button>
        }
        right={
          <button data-cy="graphs-modify" onClick={() => setIsModalOpen(true)}>
            Modify
          </button>
        }
      />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }} data-cy="screen">
        {exerciseIds.length < 1 ? (
          <div className="p-8 text-2xl font-bold text-center text-gray-600">
            Finish at least one workout to see the graphs.
          </div>
        ) : props.settings.graphs.length === 0 ? (
          <div className="p-8 text-2xl font-bold text-center text-gray-600">
            Select graphs you want to display by clicking "Modify" at right top corner.
          </div>
        ) : (
          props.settings.graphs.map((graph) => {
            if (graph.type === "exercise") {
              return (
                <GraphExercise
                  key={graph}
                  settings={props.settings}
                  history={props.history}
                  exercise={{ id: graph.id, equipment: exerciseTypes[graph.id] }}
                />
              );
            } else if (graph.type === "statsWeight") {
              const collection = getWeightDataForGraph(props.stats.weight[graph.id] || [], props.settings);
              return (
                <GraphStats
                  units={props.settings.units}
                  key={graph.id}
                  settings={props.settings}
                  collection={collection}
                  statsKey={graph.id}
                />
              );
            } else {
              const collection = getLengthDataForGraph(props.stats.length[graph.id] || [], props.settings);
              return (
                <GraphStats
                  units={props.settings.lengthUnits}
                  key={graph.id}
                  settings={props.settings}
                  collection={collection}
                  statsKey={graph.id}
                />
              );
            }
          })
        )}
      </section>

      <FooterView dispatch={props.dispatch} />
      <ModalGraphs
        isHidden={!isModalOpen}
        exerciseIds={exerciseIds}
        stats={props.stats}
        graphs={props.settings.graphs}
        onClose={() => setIsModalOpen(false)}
        dispatch={props.dispatch}
      />
    </section>
  );
}
