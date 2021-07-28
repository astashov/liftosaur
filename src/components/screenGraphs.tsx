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
import { GroupHeader } from "./groupHeader";
import { MenuItemEditable } from "./menuItemEditable";
import { ILoading } from "../models/state";

interface IProps {
  dispatch: IDispatch;
  loading: ILoading;
  settings: ISettings;
  stats: IStats;
  history: IHistoryRecord[];
}

export function ScreenGraphs(props: IProps): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSameXAxis, setIsSameXAxis] = useState<boolean>(false);
  const [isWithBodyweight, setIsWithBodyweight] = useState<boolean>(false);
  const maxSets = History.findAllMaxSets(props.history);
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
          <section>
            <GroupHeader name="Settings">
              <MenuItemEditable
                type="boolean"
                name="Same range for X axis for all graphs"
                value={isSameXAxis ? "true" : "false"}
                onChange={(v) => setIsSameXAxis(v === "true")}
              />
              {hasBodyweight && (
                <MenuItemEditable
                  type="boolean"
                  name="Add bodyweight to all graphs"
                  value={isWithBodyweight ? "true" : "false"}
                  onChange={(v) => setIsWithBodyweight(v === "true")}
                />
              )}
            </GroupHeader>
            <GroupHeader name="Graphs" />
            {props.settings.graphs.map((graph) => {
              if (graph.type === "exercise") {
                return (
                  <GraphExercise
                    isSameXAxis={isSameXAxis}
                    minX={Math.round(minX / 1000)}
                    maxX={Math.round(maxX / 1000)}
                    bodyweightData={hasBodyweight && isWithBodyweight ? bodyweightData : undefined}
                    key={`${graph.id}_${isSameXAxis}_${isWithBodyweight}`}
                    settings={props.settings}
                    history={props.history}
                    exercise={{ id: graph.id, equipment: exerciseTypes[graph.id] }}
                  />
                );
              } else if (graph.type === "statsWeight") {
                const collection = getWeightDataForGraph(props.stats.weight[graph.id] || [], props.settings);
                return (
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
                );
              } else {
                const collection = getLengthDataForGraph(props.stats.length[graph.id] || [], props.settings);
                return (
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
                );
              }
            })}
          </section>
        )}
      </section>

      <FooterView loading={props.loading} dispatch={props.dispatch} />
      <ModalGraphs
        settings={props.settings}
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
