import { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ModalStatsContent } from "../../components/modalStats";

export function NavModalStatsSettings(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true} isFullWidth={true}>
      <ModalStatsContent isHidden={false} settings={state.storage.settings} dispatch={dispatch} onClose={onClose} />
    </ModalScreenContainer>
  );
}
