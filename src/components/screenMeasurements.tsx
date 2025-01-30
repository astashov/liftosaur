import { h, JSX } from "preact";
import { IStats, ISettings, ISubscription } from "../types";
import { IDispatch } from "../ducks/types";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { StatsList } from "./statsList";
import { HelpMeasurements } from "./help/helpMeasurements";
import { INavCommon } from "../models/state";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  subscription: ISubscription;
  stats: IStats;
  navCommon: INavCommon;
}

export function ScreenMeasurements(props: IProps): JSX.Element {
  const { settings, stats, dispatch } = props;

  return (
    <Surface
      navbar={
        <NavbarView
          navCommon={props.navCommon}
          dispatch={props.dispatch}
          helpContent={<HelpMeasurements />}
          title="Measurements"
        />
      }
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
    >
      <StatsList subscription={props.subscription} stats={stats} settings={settings} dispatch={dispatch} />
    </Surface>
  );
}
