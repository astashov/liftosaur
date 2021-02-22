import { h, JSX } from "preact";
import { Modal } from "./modal";
import { IDispatch } from "../ducks/types";
import { MenuItemEditable } from "./menuItemEditable";
import { ISettings, IStatsLength, IStatsWeight } from "../types";
import { EditStats } from "../models/editStats";

interface IModalStatsProps {
  dispatch: IDispatch;
  settings: ISettings;
  onClose: () => void;
}

export function ModalStats(props: IModalStatsProps): JSX.Element {
  const statsEnabled = props.settings.statsEnabled;

  function saveWeight(name: keyof IStatsWeight): (v?: string) => void {
    return function (v?: string) {
      EditStats.toggleWeightStats(props.dispatch, name, v === "true");
    };
  }

  function saveLength(name: keyof IStatsLength): (v?: string) => void {
    return function (v?: string) {
      EditStats.toggleLengthStats(props.dispatch, name, v === "true");
    };
  }

  return (
    <Modal isFullWidth={true} shouldShowClose={true} onClose={props.onClose}>
      <form data-cy="modal-stats" onSubmit={(e) => e.preventDefault()}>
        <MenuItemEditable
          onChange={saveWeight("weight")}
          name="Weight"
          type="boolean"
          value={`${statsEnabled.weight.weight}`}
        />
        <MenuItemEditable
          onChange={saveLength("neck")}
          name="Neck"
          type="boolean"
          value={`${statsEnabled.length.neck}`}
        />
        <MenuItemEditable
          onChange={saveLength("shoulders")}
          name="Shoulders"
          type="boolean"
          value={`${statsEnabled.length.shoulders}`}
        />
        <MenuItemEditable
          onChange={saveLength("bicepLeft")}
          name="Bicep Left"
          type="boolean"
          value={`${statsEnabled.length.bicepLeft}`}
        />
        <MenuItemEditable
          onChange={saveLength("bicepRight")}
          name="Bicep Right"
          type="boolean"
          value={`${statsEnabled.length.bicepRight}`}
        />
        <MenuItemEditable
          onChange={saveLength("forearmLeft")}
          name="Forearm Left"
          type="boolean"
          value={`${statsEnabled.length.forearmLeft}`}
        />
        <MenuItemEditable
          onChange={saveLength("forearmRight")}
          name="Forearm Right"
          type="boolean"
          value={`${statsEnabled.length.forearmRight}`}
        />
        <MenuItemEditable
          onChange={saveLength("chest")}
          name="Chest"
          type="boolean"
          value={`${statsEnabled.length.chest}`}
        />
        <MenuItemEditable
          onChange={saveLength("waist")}
          name="Waist"
          type="boolean"
          value={`${statsEnabled.length.waist}`}
        />
        <MenuItemEditable
          onChange={saveLength("hips")}
          name="Hips"
          type="boolean"
          value={`${statsEnabled.length.hips}`}
        />
        <MenuItemEditable
          onChange={saveLength("thighLeft")}
          name="Thigh Left"
          type="boolean"
          value={`${statsEnabled.length.thighLeft}`}
        />
        <MenuItemEditable
          onChange={saveLength("thighRight")}
          name="Thigh Right"
          type="boolean"
          value={`${statsEnabled.length.thighRight}`}
        />
        <MenuItemEditable
          onChange={saveLength("calfLeft")}
          name="Calf Left"
          type="boolean"
          value={`${statsEnabled.length.calfLeft}`}
        />
        <MenuItemEditable
          onChange={saveLength("calfRight")}
          name="Calf Right"
          type="boolean"
          value={`${statsEnabled.length.calfRight}`}
        />
      </form>
    </Modal>
  );
}
