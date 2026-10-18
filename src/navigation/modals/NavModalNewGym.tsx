import { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { ModalNewGymContent } from "../../components/modalNewGym";
import { EditEquipment_addGym } from "../../models/editEquipment";

export function NavModalNewGym(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose}>
      <FormSheet>
        <ModalNewGymContent
          onClose={onClose}
          onSelect={(name) => {
            EditEquipment_addGym(dispatch, name, state.storage.settings.units);
            onClose();
          }}
        />
      </FormSheet>
    </ModalScreenContainer>
  );
}
