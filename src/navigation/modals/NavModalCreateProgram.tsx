import { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ModalCreateProgramContent } from "../../components/modalCreateProgram";
import { EditProgram_create } from "../../models/editProgram";

export function NavModalCreateProgram(): JSX.Element {
  const { dispatch } = useAppState();
  const navigation = useNavigation();

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose}>
      <ModalCreateProgramContent
        onSelect={(name) => {
          EditProgram_create(dispatch, name);
          onClose();
        }}
        onClose={onClose}
      />
    </ModalScreenContainer>
  );
}
