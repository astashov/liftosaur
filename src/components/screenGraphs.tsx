import { h, JSX, Fragment } from "preact";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { IDispatch } from "../ducks/types";
import { Graph } from "./graph";
import { IHistoryRecord, History } from "../models/history";
import { Thunk } from "../ducks/thunks";
import { ISettings } from "../models/settings";
import { useState } from "preact/hooks";
import { ModalGraphs } from "./modalGraphs";
import { ObjectUtils } from "../utils/object";
import { IExerciseId, IEquipment } from "../models/exercise";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
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
          props.settings.graphs.map((exerciseId) => {
            return (
              <Graph
                key={exerciseId}
                settings={props.settings}
                history={props.history}
                exercise={{ id: exerciseId, equipment: exerciseTypes[exerciseId] }}
              />
            );
          })
        )}
      </section>

      <FooterView dispatch={props.dispatch} />
      <ModalGraphs
        isHidden={!isModalOpen}
        exerciseIds={exerciseIds}
        selectedExerciseIds={props.settings.graphs}
        onClose={() => setIsModalOpen(false)}
        dispatch={props.dispatch}
      />
    </section>
  );
}
