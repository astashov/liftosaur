import { h, JSX } from "preact";
import { IDispatch } from "../../ducks/types";
import { IPoints } from "../../models/muscle";
import { ISettings } from "../../types";
import { ILoading } from "../../models/state";
import { MusclesView } from "./musclesView";
import { Surface } from "../surface";
import { NavbarView } from "../navbar";
import { IScreen, Screen } from "../../models/screen";
import { Footer2View } from "../footer2";

interface IProps {
  dispatch: IDispatch;
  title: string;
  screenStack: IScreen[];
  helpContent: JSX.Element;
  points: IPoints;
  settings: ISettings;
  loading: ILoading;
}

export function ScreenMuscles(props: IProps): JSX.Element {
  return (
    <Surface
      navbar={
        <NavbarView
          loading={props.loading}
          dispatch={props.dispatch}
          screenStack={props.screenStack}
          title="Muscles Map"
          subtitle={props.title}
          helpContent={props.helpContent}
        />
      }
      footer={<Footer2View dispatch={props.dispatch} screen={Screen.current(props.screenStack)} />}
    >
      <MusclesView title={props.title} points={props.points} settings={props.settings} />
    </Surface>
  );
}
