import { useTranslation } from "../i18n/context";
import type { JSX } from "react";
import { Platform, View } from "react-native";
import { IDispatch } from "../ducks/types";
import { Lens, lb } from "lens-shmens";
import { MenuItemEditable } from "./menuItemEditable";
import { ISettingsTimers, ISettings } from "../types";
import { INavCommon } from "../models/state";
import { useNavOptions } from "../navigation/useNavOptions";
import { GroupHeader } from "./groupHeader";

interface IProps {
  dispatch: IDispatch;
  timers: ISettingsTimers;
  navCommon: INavCommon;
}

export function ScreenTimers(props: IProps): JSX.Element {
  const translate = useTranslation();
  const onChange = (key: keyof ISettingsTimers) => {
    return (newValue?: string) => {
      const v = newValue != null && newValue !== "" ? parseInt(newValue, 10) : undefined;
      if (v != null && isNaN(v)) {
        return;
      }
      const lensRecording = Lens.buildLensRecording(lb<ISettings>().p("timers").p(key), v);
      props.dispatch({ type: "UpdateSettings", lensRecording, desc: `Update ${key} timer` });
    };
  };

  useNavOptions({ navTitle: translate("Rest Timers"), navHelpKey: "timers" });

  return (
    <View className="px-gutter">
      <GroupHeader name="Rest Timers between sets" label={translate("Rest Timers between sets")} />
      <MenuItemEditable
        name="Warmup"
        label={translate("Warmup")}
        type="number"
        value={props.timers.warmup?.toString() || undefined}
        valueUnits="sec"
        onChange={onChange("warmup")}
      />
      <MenuItemEditable
        name="Workout"
        label={translate("Workout")}
        type="number"
        value={props.timers.workout?.toString() || undefined}
        valueUnits="sec"
        onChange={onChange("workout")}
      />
      <MenuItemEditable
        name="Superset"
        label={translate("Superset")}
        type="number"
        value={props.timers.superset?.toString()}
        valueUnits="sec"
        onChange={onChange("superset")}
      />
      <GroupHeader name="Timed sets" label={translate("Timed sets")} topPadding={true} />
      <MenuItemEditable
        name="Get ready"
        label={translate("Get ready")}
        type="number"
        value={props.timers.getReady?.toString()}
        valueUnits="sec"
        onChange={onChange("getReady")}
      />
      {(Platform.OS === "ios" || Platform.OS === "android") && (
        <>
          <GroupHeader name="Reminders" label={translate("Reminders")} topPadding={true} />
          <MenuItemEditable
            name="About ongoing workout"
            label={translate("About ongoing workout")}
            type="number"
            value={props.timers.reminder?.toString() || undefined}
            valueUnits="sec"
            onChange={onChange("reminder")}
          />
        </>
      )}
    </View>
  );
}
