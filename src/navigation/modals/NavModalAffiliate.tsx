import { JSX } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ModalAffiliateContent } from "../../components/modalAffiliate";

export function NavModalAffiliate(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose} isFullWidth>
      <ModalAffiliateContent
        onClose={onClose}
        isAffiliateEnabled={!!state.storage.settings.affiliateEnabled}
        dispatch={dispatch}
      />
      <View style={{ height: insets.bottom }} />
    </ModalScreenContainer>
  );
}
