import { JSX } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { ModalPlatesContent } from "../../components/modalPlates";
import { Equipment_setupOf } from "../../models/equipment";
import { EquipmentSetupEdit_addWeight } from "../../models/equipmentSetupEdit";
import { EditEquipment_update } from "../../models/editEquipment";
import { Dialog_alert } from "../../utils/dialog";
import type { IRootStackParamList } from "../types";

const TITLES: Record<IRootStackParamList["newPlateModal"]["list"], string> = {
  plates: "New plate size",
  addOn: "New plate you add",
  builtin: "New built-in weight",
  values: "New single weight",
};

export function NavModalPlates(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{ key: string; name: "newPlateModal"; params: IRootStackParamList["newPlateModal"] }>();
  const { gymId, equipmentId, list } = route.params;
  const settings = state.storage.settings;
  const data = settings.gyms.find((g) => g.id === gymId)?.equipment[equipmentId];

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose}>
      <FormSheet>
        <ModalPlatesContent
          units={data != null ? Equipment_setupOf(data, settings).unit : settings.units}
          title={TITLES[list]}
          onClose={onClose}
          onSelect={(value) => {
            onClose();
            if (data != null) {
              const next = EquipmentSetupEdit_addWeight(Equipment_setupOf(data, settings), list, value);
              const errors = EditEquipment_update(dispatch, gymId, equipmentId, next, settings.units);
              if (errors.length > 0) {
                Dialog_alert(errors[0]);
              }
            }
          }}
        />
      </FormSheet>
    </ModalScreenContainer>
  );
}
