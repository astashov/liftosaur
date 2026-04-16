import { JSX } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ModalPlatesContent } from "../../components/modalPlates";
import { IState, updateState } from "../../models/state";
import { lb } from "lens-shmens";
import { Weight_build, Weight_eqeq } from "../../models/weight";
import { IAllEquipment, IEquipment } from "../../types";
import type { IRootStackParamList } from "../types";

export function NavModalPlates(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{ key: string; name: "newPlateModal"; params: IRootStackParamList["newPlateModal"] }>();
  const equipment: IEquipment = route.params.equipment;

  const onClose = (): void => {
    navigation.goBack();
  };

  const selectedGym =
    state.storage.settings.gyms.find((g) => g.id === state.selectedGymId) ?? state.storage.settings.gyms[0];
  const equipmentData = selectedGym?.equipment[equipment];
  const units = equipmentData?.unit ?? state.storage.settings.units;

  return (
    <ModalScreenContainer onClose={onClose}>
      <ModalPlatesContent
        units={units}
        onClose={onClose}
        onSelect={(value) => {
          if (selectedGym && equipmentData) {
            const newWeight = Weight_build(value, units);
            const existingPlates = equipmentData.plates.filter((p) => p.weight.unit === units);
            if (existingPlates.every((p) => !Weight_eqeq(p.weight, newWeight))) {
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
                      return {
                        ...all,
                        [equipment]: { ...current, plates: [...current.plates, { weight: newWeight, num: 2 }] },
                      };
                    }),
                ],
                "Add plate"
              );
            }
          }
          onClose();
        }}
      />
    </ModalScreenContainer>
  );
}
