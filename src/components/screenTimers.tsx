import { h, JSX } from "preact";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { IDispatch } from "../ducks/types";
import { ObjectUtils } from "../utils/object";
import { StringUtils } from "../utils/string";
import { ISettingsTimers, ISettings } from "../models/settings";
import { Lens } from "../utils/lens";
import { MenuItemEditable } from "./menuItemEditable";

interface IProps {
  dispatch: IDispatch;
  timers: ISettingsTimers;
}

export function ScreenTimers(props: IProps): JSX.Element {
  return (
    <section className="flex flex-col h-full">
      <HeaderView title="Timers" left={<button onClick={() => props.dispatch({ type: "PullScreen" })}>Back</button>} />
      <section className="flex-1 w-full">
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
                const lensRecording = Lens.buildLensRecording(Lens.build<ISettings>().p("timers").p(timerType), v);
                props.dispatch({ type: "UpdateSettings", lensRecording });
              }}
            />
          );
        })}
      </section>
      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
