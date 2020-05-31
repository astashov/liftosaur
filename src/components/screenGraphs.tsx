import { h, JSX } from "preact";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { IDispatch } from "../ducks/types";
import { IStats } from "../models/stats";
import { Graph } from "./graph";
import { IHistoryRecord } from "../models/history";

interface IProps {
  dispatch: IDispatch;
  stats: IStats;
  history: IHistoryRecord[];
}

export function ScreenGraphs(props: IProps): JSX.Element {
  return (
    <section className="flex flex-col h-full">
      <HeaderView title="Graphs" left={<button onClick={() => props.dispatch({ type: "PullScreen" })}>Back</button>} />
      <section className="flex-1 h-0 overflow-y-auto">
        <Graph history={props.history} excercise="squat" />
        <Graph history={props.history} excercise="benchPress" />
        <Graph history={props.history} excercise="overheadPress" />
        <Graph history={props.history} excercise="deadlift" />
      </section>

      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
