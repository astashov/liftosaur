import { h, JSX, Fragment } from "preact";
import { IScreen } from "../models/screen";
import { IStats, ISettings } from "../types";
import { ILoading } from "../models/state";
import { IDispatch } from "../ducks/types";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { FooterButton } from "./footerButton";
import { Thunk } from "../ducks/thunks";
import { IconCog2 } from "./icons/iconCog2";
import { IconGraphs2 } from "./icons/iconGraphs2";
import { StatsList } from "./statsList";
import { IconDumbbell } from "./icons/iconDumbbell";
import { RightFooterButtons } from "./rightFooterButtons";

interface IProps {
  dispatch: IDispatch;
  loading: ILoading;
  settings: ISettings;
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
          onHelpClick={() => {}}
          screenStack={props.screenStack}
          title="Measurements"
        />
      }
      footer={
        <Footer2View
          dispatch={props.dispatch}
          onCtaClick={() => props.dispatch(Thunk.pushScreen("stats"))}
          ctaTitle="New Measure"
          leftButtons={
            <FooterButton
              icon={<IconDumbbell />}
              text="Workouts"
              onClick={() => props.dispatch(Thunk.pushScreen("main"))}
            />
          }
          rightButtons={<RightFooterButtons dispatch={props.dispatch} />}
        />
      }
    >
      <StatsList stats={stats} settings={settings} dispatch={dispatch} />
    </Surface>
  );
}
