import type { JSX } from "react";
import { IStats, ISettings, ISubscription } from "../types";
import { IDispatch } from "../ducks/types";
import { StatsList } from "./statsList";
import { HelpMeasurements } from "./help/helpMeasurements";
import { INavCommon } from "../models/state";
import { useNavOptions } from "../navigation/useNavOptions";
import { Screen_current } from "../models/screen";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  subscription: ISubscription;
  stats: IStats;
  navCommon: INavCommon;
}

export function ScreenMeasurements(props: IProps): JSX.Element {
  const { settings, stats, dispatch } = props;
  const stack = props.navCommon.screenStack;
  const screenData = Screen_current(stack);
  const initialKey = screenData.name === "measurements" ? screenData.params?.key : undefined;

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
