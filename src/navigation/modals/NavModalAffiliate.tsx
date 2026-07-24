import { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { ModalAffiliateContent } from "../../components/modalAffiliate";

export function NavModalAffiliate(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose} isFullWidth>
      <FormSheet>
        <ModalAffiliateContent
          onClose={onClose}
          isAffiliateEnabled={!!state.storage.settings.affiliateEnabled}
          dispatch={dispatch}
        />
      </FormSheet>
    </ModalScreenContainer>
  );
}
