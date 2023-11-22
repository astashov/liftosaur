import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { ObjectUtils } from "../utils/object";
import { StringUtils } from "../utils/string";
import { Lens, lb } from "lens-shmens";
import { MenuItemEditable } from "./menuItemEditable";
import { ISettingsTimers, ISettings } from "../types";
import { ILoading } from "../models/state";
import { IScreen, Screen } from "../models/screen";
import { Surface } from "./surface";
import { Footer2View } from "./footer2";
import { NavbarView } from "./navbar";
import { HelpTimers } from "./help/helpTimers";

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
          title="Rest Timers"
          helpContent={<HelpTimers />}
        />
      }
      footer={<Footer2View dispatch={props.dispatch} screen={Screen.current(props.screenStack)} />}
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
