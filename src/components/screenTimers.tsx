import { h, JSX } from "preact";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { IDispatch } from "../ducks/types";
import { MenuItem } from "./menuItem";
import { ObjectUtils } from "../utils/object";
import { StringUtils } from "../utils/string";
import { ISettingsTimers, Settings } from "../models/settings";
import { Lens } from "../utils/lens";

interface IProps {
  dispatch: IDispatch;
  timers: ISettingsTimers;
}

export function ScreenTimers(props: IProps): JSX.Element {
  return (
    <section className="flex flex-col h-full">
      <HeaderView title="Timers" left={<button onClick={() => props.dispatch({ type: "PullScreen" })}>Back</button>} />
      <section className="flex-1 w-full">
        {ObjectUtils.keys(props.timers).map(key => {
          const timer = props.timers[key];
          return (
            <MenuItem
              name={StringUtils.capitalize(key)}
              type="number"
              value={timer}
              valueUnits="sec"
              onChange={(newValue: string) => {
                props.dispatch({
                  type: "UpdateSettings",
                  lensPlay: Lens.buildLensPlay(
                    Settings.lens.timers.then(Settings.lens.timersField(key)),
                    parseInt(newValue, 10)
                  )
                });
              }}
            />
          );
        })}
      </section>
      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
