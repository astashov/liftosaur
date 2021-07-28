import { h, JSX } from "preact";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { IDispatch } from "../ducks/types";
import { ObjectUtils } from "../utils/object";
import { StringUtils } from "../utils/string";
import { Lens, lb } from "lens-shmens";
import { MenuItemEditable } from "./menuItemEditable";
import { Thunk } from "../ducks/thunks";
import { ISettingsTimers, ISettings } from "../types";
import { ILoading } from "../models/state";

interface IProps {
  dispatch: IDispatch;
  timers: ISettingsTimers;
  loading: ILoading;
}

export function ScreenTimers(props: IProps): JSX.Element {
  return (
    <section className="h-full">
      <HeaderView title="Timers" left={<button onClick={() => props.dispatch(Thunk.pullScreen())}>Back</button>} />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        {ObjectUtils.keys(props.timers).map((timerType) => {
          const timer = props.timers[timerType];
          return (
            <MenuItemEditable
              name={StringUtils.capitalize(timerType)}
              type="number"
              hasClear={true}
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
      <FooterView loading={props.loading} dispatch={props.dispatch} />
    </section>
  );
}
