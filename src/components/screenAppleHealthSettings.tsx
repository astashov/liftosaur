import type { JSX } from "react";
import { View } from "react-native";
import { IDispatch } from "../ducks/types";
import { lb } from "lens-shmens";
import { MenuItemEditable } from "./menuItemEditable";
import { ISettings } from "../types";
import { INavCommon } from "../models/state";
import { useNavOptions } from "../navigation/useNavOptions";
import { Thunk_syncHealthKit } from "../ducks/thunks";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  navCommon: INavCommon;
}

export function ScreenAppleHealthSettings(props: IProps): JSX.Element {
  useNavOptions({ navTitle: "Apple Health" });

  return (
    <View className="px-4">
      <MenuItemEditable
        name="Sync Workouts"
        type="boolean"
        value={props.settings.appleHealthSyncWorkout ? "true" : "false"}
        onChange={(newValue?: string) => {
          props.dispatch({
            type: "UpdateSettings",
            lensRecording: lb<ISettings>()
              .p("appleHealthSyncWorkout")
              .record(newValue === "true"),
            desc: "Toggle Apple Health workouts",
          });
        }}
      />
      <MenuItemEditable
        name="Confirm each workout sync?"
        type="boolean"
        value={props.settings.healthConfirmation ? "true" : "false"}
        onChange={(newValue?: string) => {
          props.dispatch({
            type: "UpdateSettings",
            lensRecording: lb<ISettings>()
              .p("healthConfirmation")
              .record(newValue === "true"),
            desc: "Toggle Health workout confirmation",
          });
        }}
      />
      <MenuItemEditable
        name="Sync Measurements"
        type="boolean"
        value={props.settings.appleHealthSyncMeasurements ? "true" : "false"}
        onChange={(newValue?: string) => {
          props.dispatch({
            type: "UpdateSettings",
            lensRecording: lb<ISettings>()
              .p("appleHealthSyncMeasurements")
              .record(newValue === "true"),
            desc: "Toggle Apple Health measurements",
          });
        }}
      />
      <MenuItemEditable
        name="Sync Sleep & Nutrition"
        type="boolean"
        value={props.settings.appleHealthSyncSleepNutrition ? "true" : "false"}
        onChange={(newValue?: string) => {
          props.dispatch({
            type: "UpdateSettings",
            lensRecording: lb<ISettings>()
              .p("appleHealthSyncSleepNutrition")
              .record(newValue === "true"),
            desc: "Toggle Apple Health sleep & nutrition",
          });
          if (newValue === "true") {
            props.dispatch(Thunk_syncHealthKit());
          }
        }}
      />
    </View>
  );
}
