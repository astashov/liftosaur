import { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ModalImportFromLinkContent } from "../../components/modalImportFromLink";
import { Thunk_importFromLink } from "../../ducks/thunks";

export function NavModalImportFromLink(): JSX.Element {
  const { dispatch } = useAppState();
  const navigation = useNavigation();

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose}>
      <ModalImportFromLinkContent
        onSubmit={(link) => {
          if (link) {
            dispatch(Thunk_importFromLink(link));
          }
          onClose();
        }}
      />
    </ModalScreenContainer>
  );
}
