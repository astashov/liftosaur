import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { ObjectUtils } from "../utils/object";
import { StringUtils } from "../utils/string";
import { Lens, lb } from "lens-shmens";
import { MenuItemEditable } from "./menuItemEditable";
import { ISettingsTimers, ISettings } from "../types";
import { ILoading } from "../models/state";
import { IScreen } from "../models/screen";
import { Surface } from "./surface";
import { Footer2View } from "./footer2";
import { rightFooterButtons } from "./rightFooterButtons";
import { NavbarView } from "./navbar";

interface IProps {
  dispatch: IDispatch;
  timers: ISettingsTimers;
  loading: ILoading;
  screenStack: IScreen[];
}

export function ScreenTimers(props: IProps): JSX.Element {
  return (
    <Surface
      navbar={
        <NavbarView
          loading={props.loading}
          dispatch={props.dispatch}
          screenStack={props.screenStack}
          title="Timers"
          onHelpClick={() => {}}
        />
      }
      footer={<Footer2View dispatch={props.dispatch} rightButtons={rightFooterButtons({ dispatch: props.dispatch })} />}
    >
      <section className="px-4">
        {ObjectUtils.keys(props.timers).map((timerType) => {
          const timer = props.timers[timerType];
          return (
            <MenuItemEditable
              name={StringUtils.capitalize(timerType)}
              type="number"
              value={timer?.toString() || null}
              valueUnits="sec"
              onChange={(newValue?: string) => {
                const v = newValue != null && newValue !== "" ? parseInt(newValue, 10) : null;
                const lensRecording = Lens.buildLensRecording(lb<ISettings>().p("timers").p(timerType), v);
                props.dispatch({ type: "UpdateSettings", lensRecording });
              }}
            />
          );
        })}
      </section>
    </Surface>
  );
}
