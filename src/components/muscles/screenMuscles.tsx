import { h, JSX } from "preact";
import { IDispatch } from "../../ducks/types";
import { IPoints } from "../../models/muscle";
import { ISettings } from "../../types";
import { ILoading } from "../../models/state";
import { MusclesView } from "./musclesView";
import { Surface } from "../surface";
import { NavbarView } from "../navbar";
import { IScreen } from "../../models/screen";
import { Footer2View } from "../footer2";
import { rightFooterButtons } from "../rightFooterButtons";

interface IProps {
  dispatch: IDispatch;
  title: string;
  screenStack: IScreen[];
  headerHelp: JSX.Element;
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
          onHelpClick={() => {}}
        />
      }
      footer={<Footer2View dispatch={props.dispatch} rightButtons={rightFooterButtons({ dispatch: props.dispatch })} />}
    >
      <MusclesView title={props.title} headerHelp={props.headerHelp} points={props.points} settings={props.settings} />
    </Surface>
  );
}
