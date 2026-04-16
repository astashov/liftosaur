import { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ModalNewEquipmentContent } from "../../components/modalNewEquipment";
import { IState, updateState } from "../../models/state";
import { IAllEquipment } from "../../types";
import { lb } from "lens-shmens";
import { UidFactory_generateUid } from "../../utils/generator";
import { Equipment_build } from "../../models/equipment";

export function NavModalNewEquipment(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();

  const onClose = (): void => {
    navigation.goBack();
  };

  const selectedGym =
    state.storage.settings.gyms.find((g) => g.id === state.selectedGymId) ?? state.storage.settings.gyms[0];

  return (
    <ModalScreenContainer onClose={onClose}>
      <ModalNewEquipmentContent
        onClose={onClose}
        onSelect={(name) => {
          if (selectedGym) {
            updateState(
              dispatch,
              [
                lb<IState>()
                  .p("storage")
                  .p("settings")
                  .p("gyms")
                  .findBy("id", selectedGym.id)
                  .p("equipment")
                  .recordModify((oldEquipment: IAllEquipment) => {
                    const id = `equipment-${UidFactory_generateUid(8)}`;
                    return { ...oldEquipment, [id]: Equipment_build(name) };
                  }),
              ],
              "Add new equipment"
            );
          }
          onClose();
        }}
      />
    </ModalScreenContainer>
  );
}
