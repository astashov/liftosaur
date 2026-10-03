import { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { useModalData, useModalDispatch, Modal_setResult, Modal_clear } from "../ModalStateContext";
import { EditDetailsForm } from "../../components/editDetailsForm";

export function NavModalEditDetails(): JSX.Element {
  const navigation = useNavigation();
  const modalDispatch = useModalDispatch();
  const data = useModalData("editDetailsModal");

  const onClose = (): void => {
    Modal_clear(modalDispatch, "editDetailsModal");
    navigation.goBack();
  };

  if (!data) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true} zIndex={70}>
      <FormSheet>
        <EditDetailsForm
          data={data}
          onCancel={onClose}
          onSubmit={(result) => {
            Modal_setResult(modalDispatch, "editDetailsModal", result);
            Modal_clear(modalDispatch, "editDetailsModal");
            navigation.goBack();
          }}
        />
      </FormSheet>
    </ModalScreenContainer>
  );
}
