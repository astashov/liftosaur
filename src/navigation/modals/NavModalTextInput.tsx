import { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { useModalData, useModalDispatch, Modal_setResult, Modal_clear } from "../ModalStateContext";
import { TextInputModalContent } from "../../components/textInputModalContent";

export function NavModalTextInput(): JSX.Element {
  const navigation = useNavigation();
  const modalDispatch = useModalDispatch();
  const data = useModalData("textInputModal");

  const onClose = (): void => {
    Modal_clear(modalDispatch, "textInputModal");
    navigation.goBack();
  };

  if (!data) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true} zIndex={70}>
      <FormSheet>
        <TextInputModalContent
          data={data}
          onClose={onClose}
          onSubmit={(value) => {
            Modal_setResult(modalDispatch, "textInputModal", value);
            Modal_clear(modalDispatch, "textInputModal");
            navigation.goBack();
          }}
        />
      </FormSheet>
    </ModalScreenContainer>
  );
}
