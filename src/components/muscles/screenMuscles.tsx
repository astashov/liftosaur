import { h, JSX } from "preact";
import { IDispatch } from "../../ducks/types";
import { HeaderView } from "../header";
import { FooterView } from "../footer";
import { IPoints } from "../../models/muscle";
import { ISettings } from "../../types";
import { ILoading } from "../../models/state";
import { MusclesView } from "./musclesView";

interface IProps {
  dispatch: IDispatch;
  title: string;
  headerTitle: string;
  headerHelp: JSX.Element;
  points: IPoints;
  settings: ISettings;
  loading: ILoading;
}

export function ScreenMuscles(props: IProps): JSX.Element {
  return (
    <section className="h-full">
      <HeaderView
        title={props.title}
        subtitle="Muscles Map"
        left={<button onClick={() => props.dispatch({ type: "PullScreen" })}>Back</button>}
      />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <MusclesView
          title={props.title}
          headerTitle={props.headerTitle}
          headerHelp={props.headerHelp}
          points={props.points}
          settings={props.settings}
        />
      </section>

      <FooterView loading={props.loading} dispatch={props.dispatch} />
    </section>
  );
}
