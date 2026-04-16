import { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ModalNewGymContent } from "../../components/modalNewGym";
import { IState, updateState } from "../../models/state";
import { lb } from "lens-shmens";
import { UidFactory_generateUid } from "../../utils/generator";
import { Settings_defaultEquipment } from "../../models/settings";

export function NavModalNewGym(): JSX.Element {
  const { dispatch } = useAppState();
  const navigation = useNavigation();

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose}>
      <ModalNewGymContent
        onClose={onClose}
        onSelect={(name) => {
          updateState(
            dispatch,
            [
              lb<IState>()
                .p("storage")
                .p("settings")
                .p("gyms")
                .recordModify((oldGyms) => {
                  const id = `gym-${UidFactory_generateUid(8)}`;
                  return [...oldGyms, { vtype: "gym" as const, id, name, equipment: Settings_defaultEquipment() }];
                }),
            ],
            "Add new gym"
          );
          onClose();
        }}
      />
    </ModalScreenContainer>
  );
}
