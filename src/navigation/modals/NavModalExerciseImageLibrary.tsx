import { JSX, useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { ExerciseImageLibraryContent } from "../../components/exercisePicker/bottomSheetExerciseImageLibrary";
import { AppContext } from "../../components/appContext";
import { Service } from "../../api/service";
import { useModalDispatch, Modal_setResult, Modal_clear } from "../ModalStateContext";

export function NavModalExerciseImageLibrary(): JSX.Element {
  const { state } = useAppState();
  const navigation = useNavigation();
  const modalDispatch = useModalDispatch();
  const appContext = useContext(AppContext);
  const service = appContext.service ?? new Service(window.fetch.bind(window));

  const onClose = (): void => {
    Modal_clear(modalDispatch, "exerciseImageLibraryModal");
    navigation.goBack();
  };

  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      <ExerciseImageLibraryContent
        settings={state.storage.settings}
        isLoggedIn={!!state.user?.id}
        service={service}
        onClose={onClose}
        onSelect={(smallImageUrl, largeImageUrl) => {
          Modal_setResult(modalDispatch, "exerciseImageLibraryModal", { smallImageUrl, largeImageUrl });
          Modal_clear(modalDispatch, "exerciseImageLibraryModal");
          navigation.goBack();
        }}
      />
    </SheetScreenContainer>
  );
}
