import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { Lens, lb } from "lens-shmens";
import { MenuItemEditable } from "./menuItemEditable";
import { ISettingsTimers, ISettings } from "../types";
import { INavCommon } from "../models/state";
import { Surface } from "./surface";
import { Footer2View } from "./footer2";
import { NavbarView } from "./navbar";
import { HelpTimers } from "./help/helpTimers";
import { GroupHeader } from "./groupHeader";
import { SendMessage } from "../utils/sendMessage";

interface IProps {
  dispatch: IDispatch;
  timers: ISettingsTimers;
  navCommon: INavCommon;
}

export function ScreenTimers(props: IProps): JSX.Element {
  const onChange = (key: keyof ISettingsTimers) => {
    return (newValue?: string) => {
      const v = newValue != null && newValue !== "" ? parseInt(newValue, 10) : undefined;
      const lensRecording = Lens.buildLensRecording(lb<ISettings>().p("timers").p(key), v);
      props.dispatch({ type: "UpdateSettings", lensRecording });
    };
  };

  return (
    <Surface
      navbar={
        <NavbarView
          navCommon={props.navCommon}
          dispatch={props.dispatch}
          title="Rest Timers"
          helpContent={<HelpTimers />}
        />
      }
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
    >
      <section className="px-4">
        <GroupHeader name="Rest Timers between sets" />
        <MenuItemEditable
          name="Warmup"
          type="number"
          value={props.timers.warmup?.toString() || undefined}
          valueUnits="sec"
          onChange={onChange("warmup")}
        />
        <MenuItemEditable
          name="Workout"
          type="number"
          value={props.timers.workout?.toString() || undefined}
          valueUnits="sec"
          onChange={onChange("workout")}
        />
        {((SendMessage.isIos() && SendMessage.iosVersion() >= 10) ||
          (SendMessage.isAndroid() && SendMessage.androidAppVersion() >= 19)) && (
          <>
            <GroupHeader name="Reminders" topPadding={true} />
            <MenuItemEditable
              name="About ongoing workout"
              type="number"
              value={props.timers.reminder?.toString() || undefined}
              valueUnits="sec"
              onChange={onChange("reminder")}
            />
          </>
        )}
      </section>
    </Surface>
  );
}
