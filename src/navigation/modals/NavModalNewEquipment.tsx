import { JSX } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { ModalNewEquipmentContent } from "../../components/modalNewEquipment";
import { IRootStackParamList } from "../types";
import { EditEquipment_create } from "../../models/editEquipment";
import { Thunk_pushScreen } from "../../ducks/thunks";

export function NavModalNewEquipment(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "newEquipmentModal";
    params: IRootStackParamList["newEquipmentModal"];
  }>();

  const onClose = (): void => {
    navigation.goBack();
  };

  const settings = state.storage.settings;
  const gymId =
    route.params?.gymId ?? settings.gyms.find((g) => g.id === state.selectedGymId)?.id ?? settings.gyms[0].id;

  return (
    <ModalScreenContainer onClose={onClose}>
      <FormSheet>
        <ModalNewEquipmentContent
          onClose={onClose}
          onSelect={(name, type) => {
            const linkExercise = route.params?.linkExercise;
            const equipmentId = EditEquipment_create(dispatch, settings, gymId, name, type, linkExercise);
            onClose();
            if (linkExercise == null) {
              setTimeout(() => dispatch(Thunk_pushScreen("equipmentDetail", { gymId, equipmentId })), 50);
            }
          }}
        />
      </FormSheet>
    </ModalScreenContainer>
  );
}
