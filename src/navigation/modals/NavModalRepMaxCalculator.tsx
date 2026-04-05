import { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { useModalData, useModalDispatch, Modal_setResult, Modal_clear } from "../ModalStateContext";
import { RepMaxCalculator } from "../../components/repMaxCalculator";

export function NavModalRepMaxCalculator(): JSX.Element {
  const navigation = useNavigation();
  const modalDispatch = useModalDispatch();
  const data = useModalData("repMaxCalculatorModal");

  const onClose = (): void => {
    Modal_clear(modalDispatch, "repMaxCalculatorModal");
    navigation.goBack();
  };

  if (!data) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true} isFullWidth={true}>
      <div style={{ minWidth: "80%" }} data-cy="modal-rep-max-calculator">
        <RepMaxCalculator
          backLabel="Back"
          unit={data.unit}
          onSelect={(weightValue) => {
            Modal_setResult(modalDispatch, "repMaxCalculatorModal", weightValue);
            Modal_clear(modalDispatch, "repMaxCalculatorModal");
            navigation.goBack();
          }}
        />
      </div>
    </ModalScreenContainer>
  );
}
