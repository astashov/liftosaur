import { h, JSX } from "preact";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { IDispatch } from "../ducks/types";
import { IStats } from "../models/stats";
import { Graph } from "./graph";
import { IHistoryRecord } from "../models/history";
import { Thunk } from "../ducks/thunks";

interface IProps {
  dispatch: IDispatch;
  stats: IStats;
  history: IHistoryRecord[];
}

export function ScreenGraphs(props: IProps): JSX.Element {
  return (
    <section className="h-full">
      <HeaderView title="Graphs" left={<button onClick={() => props.dispatch(Thunk.pullScreen())}>Back</button>} />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <Graph history={props.history} excercise="squat" />
        <Graph history={props.history} excercise="benchPress" />
        <Graph history={props.history} excercise="overheadPress" />
        <Graph history={props.history} excercise="deadlift" />
      </section>

      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
