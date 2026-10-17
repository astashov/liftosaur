import { JSX, useEffect } from "react";
import { View } from "react-native";
import { IDispatch } from "../ducks/types";
import { ISettings, IEquipment, IAllEquipment, IStats } from "../types";
import { INavCommon, IState, updateState } from "../models/state";
import { lb } from "lens-shmens";
import { useNavOptions } from "../navigation/useNavOptions";
import { MenuItemEditable } from "./menuItemEditable";
import { LinkButton } from "./linkButton";
import { Thunk_pushScreen } from "../ducks/thunks";
import { navigateToModal } from "../navigation/navigationService";
import { NavScreenContent } from "../navigation/NavScreenContent";
import { EquipmentList } from "./equipmentList";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  expandedEquipment?: IEquipment;
  stats: IStats;
  allEquipment: IAllEquipment;
  selectedGymId?: string;
  navCommon: INavCommon;
}

export function ScreenEquipment(props: IProps): JSX.Element {
  const selectedGym = props.settings.gyms.find((g) => g.id === props.selectedGymId) ?? props.settings.gyms[0];
  const expandedEquipment = props.expandedEquipment;

  useEffect(() => {
    if (expandedEquipment == null) {
      return;
    }
    updateState(
      props.dispatch,
      [lb<IState>().p("defaultEquipmentExpanded").record(undefined)],
      "Clear expanded equipment"
    );
    props.dispatch(Thunk_pushScreen("equipmentDetail", { gymId: selectedGym.id, equipmentId: expandedEquipment }));
  }, []);

  useNavOptions({ navTitle: "Equipment Settings", navHelpKey: "plates" });

  return (
    <NavScreenContent avoidSystemKeyboard="reveal">
      {props.settings.gyms.length > 1 ? (
        <View className="px-gutter pb-2">
          <MenuItemEditable
            type="text"
            name="Gym Name"
            value={selectedGym.name}
            onChange={(name) => {
              if (name?.trim()) {
                updateState(
                  props.dispatch,
                  [
                    lb<IState>()
                      .p("storage")
                      .p("settings")
                      .p("gyms")
                      .findBy("id", selectedGym.id)
                      .p("name")
                      .record(name.trim()),
                  ],
                  "Update gym name"
                );
              }
            }}
          />
        </View>
      ) : (
        <View className="items-end px-2 mb-2">
          <LinkButton className="text-sm" name="add-new-gym" onClick={() => props.dispatch(Thunk_pushScreen("gyms"))}>
            Manage Gyms
          </LinkButton>
        </View>
      )}
      <EquipmentList
        gymId={selectedGym.id}
        allEquipment={props.allEquipment}
        settings={props.settings}
        dispatch={props.dispatch}
        onOpen={(equipmentId) =>
          props.dispatch(Thunk_pushScreen("equipmentDetail", { gymId: selectedGym.id, equipmentId }))
        }
        onAdd={() => navigateToModal("newEquipmentModal", { gymId: selectedGym.id })}
      />
    </NavScreenContent>
  );
}
