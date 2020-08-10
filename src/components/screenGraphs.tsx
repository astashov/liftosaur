import { h, JSX } from "preact";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { IDispatch } from "../ducks/types";
import { Graph } from "./graph";
import { IHistoryRecord } from "../models/history";
import { Thunk } from "../ducks/thunks";
import { ISettings } from "../models/settings";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  history: IHistoryRecord[];
}

export function ScreenGraphs(props: IProps): JSX.Element {
  return (
    <section className="h-full">
      <HeaderView title="Graphs" left={<button onClick={() => props.dispatch(Thunk.pullScreen())}>Back</button>} />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <Graph settings={props.settings} history={props.history} excercise={{ id: "squat", bar: "barbell" }} />
        <Graph settings={props.settings} history={props.history} excercise={{ id: "benchPress", bar: "barbell" }} />
        <Graph settings={props.settings} history={props.history} excercise={{ id: "overheadPress", bar: "barbell" }} />
        <Graph settings={props.settings} history={props.history} excercise={{ id: "deadlift", bar: "barbell" }} />
      </section>

      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
