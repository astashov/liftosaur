import type { JSX } from "react";
import { IStats, ISettings, ISubscription, IStatsKey } from "../types";
import { IDispatch } from "../ducks/types";
import { StatsList } from "./statsList";
import { HelpMeasurements } from "./help/helpMeasurements";
import { INavCommon } from "../models/state";
import { useNavOptions } from "../navigation/useNavOptions";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  subscription: ISubscription;
  stats: IStats;
  navCommon: INavCommon;
  initialKey?: IStatsKey;
}

export function ScreenMeasurements(props: IProps): JSX.Element {
  const { settings, stats, dispatch } = props;
  const initialKey = props.initialKey;

  useNavOptions({ navTitle: "Measurements", navHelpContent: <HelpMeasurements /> });

  return (
    <>
      <StatsList
        initialKey={initialKey}
        subscription={props.subscription}
        stats={stats}
        settings={settings}
        dispatch={dispatch}
      />
    </>
  );
}
