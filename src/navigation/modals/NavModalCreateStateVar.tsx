import { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { FormSheet } from "../FormSheet";
import { Modal_clear, Modal_setResult, useModalData, useModalDispatch } from "../ModalStateContext";
import { ModalCreateStateVariableContent } from "../../components/editProgramExercise/progressions/modalCreateStateVariable";

export function NavModalCreateStateVar(): JSX.Element {
  const navigation = useNavigation();
  const modalDispatch = useModalDispatch();
  const data = useModalData("createStateVarModal");

  const onClose = (): void => {
    Modal_clear(modalDispatch, "createStateVarModal");
    navigation.goBack();
  };

  if (!data) {
    return <></>;
  }

  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      <FormSheet header="Add State Variable">
        <ModalCreateStateVariableContent
          existingNames={data.existingNames}
          onClose={onClose}
          onCreate={(name, type, isUserPrompted) => {
            Modal_setResult(modalDispatch, "createStateVarModal", { name, type, isUserPrompted });
            Modal_clear(modalDispatch, "createStateVarModal");
          }}
        />
      </FormSheet>
    </SheetScreenContainer>
  );
}
