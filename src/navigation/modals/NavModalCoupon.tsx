import { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ModalCouponContent } from "../../components/modalCoupon";

export function NavModalCoupon(): JSX.Element {
  const { dispatch } = useAppState();
  const navigation = useNavigation();

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose}>
      <ModalCouponContent dispatch={dispatch} onClose={onClose} />
    </ModalScreenContainer>
  );
}
