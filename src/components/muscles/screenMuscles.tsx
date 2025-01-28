import { h, JSX } from "preact";
import { IDispatch } from "../../ducks/types";
import { IPoints } from "../../models/muscle";
import { ISettings } from "../../types";
import { MusclesView } from "./musclesView";
import { Surface } from "../surface";
import { NavbarView } from "../navbar";
import { Footer2View } from "../footer2";
import { INavCommon } from "../../models/state";

interface IProps {
  dispatch: IDispatch;
  title: string;
  helpContent: JSX.Element;
  points: IPoints;
  settings: ISettings;
  navCommon: INavCommon;
}

export function ScreenMuscles(props: IProps): JSX.Element {
  return (
    <Surface
      navbar={
        <NavbarView
          navCommon={props.navCommon}
          dispatch={props.dispatch}
          title="Muscles Map"
          subtitle={props.title}
          helpContent={props.helpContent}
        />
      }
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
    >
      <MusclesView title={props.title} points={props.points} settings={props.settings} />
    </Surface>
  );
}
