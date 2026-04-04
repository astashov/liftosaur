import { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ModalImportFromOtherAppsContent } from "../../components/modalImportFromOtherApps";

export function NavModalImportFromOtherApps(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose} isFullWidth>
      <ModalImportFromOtherAppsContent settings={state.storage.settings} dispatch={dispatch} onClose={onClose} />
    </ModalScreenContainer>
  );
}
