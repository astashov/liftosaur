import { JSX } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ModalNewFixedWeightContent } from "../../components/modalNewFixedWeight";
import { IState, updateState } from "../../models/state";
import { lb } from "lens-shmens";
import { Weight_build, Weight_eqeq } from "../../models/weight";
import { IAllEquipment, IEquipment } from "../../types";
import { equipmentName } from "../../models/exercise";
import { Equipment_getEquipmentOfGym } from "../../models/equipment";
import type { IRootStackParamList } from "../types";

export function NavModalNewFixedWeight(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "newFixedWeightModal";
    params: IRootStackParamList["newFixedWeightModal"];
  }>();
  const equipment: IEquipment = route.params.equipment;

  const onClose = (): void => {
    navigation.goBack();
  };

  const selectedGym =
    state.storage.settings.gyms.find((g) => g.id === state.selectedGymId) ?? state.storage.settings.gyms[0];
  const equipmentData = selectedGym?.equipment[equipment];
  const units = equipmentData?.unit ?? state.storage.settings.units;
  const allEquipment = Equipment_getEquipmentOfGym(state.storage.settings, state.selectedGymId);
  const name = equipmentName(equipment, allEquipment);

  return (
    <ModalScreenContainer onClose={onClose}>
      <ModalNewFixedWeightContent
        units={units}
        name={name}
        onClose={onClose}
        onSelect={(value) => {
          if (selectedGym && equipmentData) {
            const newWeight = Weight_build(value, units);
            const existing = equipmentData.fixed.filter((p) => p.unit === units);
            if (existing.every((p) => !Weight_eqeq(p, newWeight))) {
              updateState(
                dispatch,
                [
                  lb<IState>()
                    .p("storage")
                    .p("settings")
                    .p("gyms")
                    .findBy("id", selectedGym.id)
                    .p("equipment")
                    .recordModify((all: IAllEquipment) => {
                      const current = all[equipment];
                      if (!current) {
                        return all;
                      }
                      return { ...all, [equipment]: { ...current, fixed: [...current.fixed, newWeight] } };
                    }),
                ],
                "Add fixed weight"
              );
            }
          }
          onClose();
        }}
      />
    </ModalScreenContainer>
  );
}
