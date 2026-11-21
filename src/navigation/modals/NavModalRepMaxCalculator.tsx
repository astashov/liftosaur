import { JSX } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { useModalData, useModalDispatch, Modal_setResult, Modal_clear } from "../ModalStateContext";
import { RepMaxCalculator } from "../../components/repMaxCalculator";
import { useAppState } from "../StateContext";
import { Rm1Formula_fromSettings } from "../../models/rm1Formula";

export function NavModalRepMaxCalculator(): JSX.Element {
  const navigation = useNavigation();
  const { state } = useAppState();
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
      <FormSheet>
        <View data-testid="modal-rep-max-calculator" testID="modal-rep-max-calculator">
          <RepMaxCalculator
            backLabel="Back"
            unit={data.unit}
            formula={Rm1Formula_fromSettings(state.storage.settings)}
            onSelect={(weightValue) => {
              if (weightValue != null) {
                Modal_setResult(modalDispatch, "repMaxCalculatorModal", weightValue);
              }
              Modal_clear(modalDispatch, "repMaxCalculatorModal");
              navigation.goBack();
            }}
          />
        </View>
      </FormSheet>
    </ModalScreenContainer>
  );
}
