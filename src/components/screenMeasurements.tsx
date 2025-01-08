import { IScreen, Screen } from "../models/screen";
import { IStats, ISettings, ISubscription } from "../types";
import { ILoading } from "../models/state";
import { IDispatch } from "../ducks/types";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { StatsList } from "./statsList";
import { HelpMeasurements } from "./help/helpMeasurements";
import { SafeAreaView, View, Text } from "react-native";

interface IProps {
  dispatch: IDispatch;
  loading: ILoading;
  settings: ISettings;
  subscription: ISubscription;
  screenStack: IScreen[];
  stats: IStats;
}

export function ScreenMeasurements(props: IProps): JSX.Element {
  const { settings, stats, dispatch } = props;

  return (
    <Surface
      navbar={
        <NavbarView
          loading={props.loading}
          dispatch={props.dispatch}
          helpContent={<HelpMeasurements />}
          screenStack={props.screenStack}
          title="Measurements"
        />
      }
      footer={
        <View className="absolute bottom-0 left-0 w-full">
          <Footer2View dispatch={props.dispatch} screen={Screen.current(props.screenStack)} />
        </View>
      }
    >
      <StatsList subscription={props.subscription} stats={stats} settings={settings} dispatch={dispatch} />
    </Surface>
  );
}
