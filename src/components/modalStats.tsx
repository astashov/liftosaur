import { useTranslation } from "../i18n/context";
import type { JSX } from "react";
import { View } from "react-native";

import { IDispatch } from "../ducks/types";
import { MenuItemEditable } from "./menuItemEditable";
import { ISettings, IStatsLength, IStatsPercentage, IStatsWeight } from "../types";
import {
  EditStats_toggleWeightStats,
  EditStats_toggleLengthStats,
  EditStats_togglePercentageStats,
} from "../models/editStats";
import { GroupHeader } from "./groupHeader";

interface IModalStatsProps {
  dispatch: IDispatch;
  settings: ISettings;
  isHidden: boolean;
  onClose: () => void;
}

export function ModalStatsContent(props: IModalStatsProps): JSX.Element {
  const translate = useTranslation();
  const statsEnabled = props.settings.statsEnabled;

  function saveWeight(name: keyof IStatsWeight): (v?: string) => void {
    return function (v?: string) {
      EditStats_toggleWeightStats(props.dispatch, name, v === "true");
    };
  }

  function saveLength(name: keyof IStatsLength): (v?: string) => void {
    return function (v?: string) {
      EditStats_toggleLengthStats(props.dispatch, name, v === "true");
    };
  }

  function savePercentage(name: keyof IStatsPercentage): (v?: string) => void {
    return function (v?: string) {
      EditStats_togglePercentageStats(props.dispatch, name, v === "true");
    };
  }

  return (
    <View className="py-4">
      <GroupHeader name="Enabled measurement types" label={translate("Enabled measurement types")} />
      <View data-testid="modal-stats" testID="modal-stats">
        <MenuItemEditable
          onChange={saveWeight("weight")}
          name="Weight"
          label={translate("Weight")}
          type="boolean"
          value={`${statsEnabled.weight.weight}`}
        />
        <MenuItemEditable
          onChange={savePercentage("bodyfat")}
          name="Bodyfat"
          label={translate("Bodyfat")}
          type="boolean"
          value={`${statsEnabled.percentage.bodyfat}`}
        />
        <MenuItemEditable
          onChange={saveLength("neck")}
          name="Neck"
          label={translate("Neck")}
          type="boolean"
          value={`${statsEnabled.length.neck}`}
        />
        <MenuItemEditable
          onChange={saveLength("shoulders")}
          name="Shoulders"
          label={translate("Shoulders")}
          type="boolean"
          value={`${statsEnabled.length.shoulders}`}
        />
        <MenuItemEditable
          onChange={saveLength("bicepLeft")}
          name="Bicep Left"
          label={translate("Bicep Left")}
          type="boolean"
          value={`${statsEnabled.length.bicepLeft}`}
        />
        <MenuItemEditable
          onChange={saveLength("bicepRight")}
          name="Bicep Right"
          label={translate("Bicep Right")}
          type="boolean"
          value={`${statsEnabled.length.bicepRight}`}
        />
        <MenuItemEditable
          onChange={saveLength("forearmLeft")}
          name="Forearm Left"
          label={translate("Forearm Left")}
          type="boolean"
          value={`${statsEnabled.length.forearmLeft}`}
        />
        <MenuItemEditable
          onChange={saveLength("forearmRight")}
          name="Forearm Right"
          label={translate("Forearm Right")}
          type="boolean"
          value={`${statsEnabled.length.forearmRight}`}
        />
        <MenuItemEditable
          onChange={saveLength("chest")}
          name="Chest"
          label={translate("Chest")}
          type="boolean"
          value={`${statsEnabled.length.chest}`}
        />
        <MenuItemEditable
          onChange={saveLength("waist")}
          name="Waist"
          label={translate("Waist")}
          type="boolean"
          value={`${statsEnabled.length.waist}`}
        />
        <MenuItemEditable
          onChange={saveLength("hips")}
          name="Hips"
          label={translate("Hips")}
          type="boolean"
          value={`${statsEnabled.length.hips}`}
        />
        <MenuItemEditable
          onChange={saveLength("thighLeft")}
          name="Thigh Left"
          label={translate("Thigh Left")}
          type="boolean"
          value={`${statsEnabled.length.thighLeft}`}
        />
        <MenuItemEditable
          onChange={saveLength("thighRight")}
          name="Thigh Right"
          label={translate("Thigh Right")}
          type="boolean"
          value={`${statsEnabled.length.thighRight}`}
        />
        <MenuItemEditable
          onChange={saveLength("calfLeft")}
          name="Calf Left"
          label={translate("Calf Left")}
          type="boolean"
          value={`${statsEnabled.length.calfLeft}`}
        />
        <MenuItemEditable
          onChange={saveLength("calfRight")}
          name="Calf Right"
          label={translate("Calf Right")}
          type="boolean"
          value={`${statsEnabled.length.calfRight}`}
        />
      </View>
    </View>
  );
}
