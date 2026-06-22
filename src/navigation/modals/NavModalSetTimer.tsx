import { JSX, useEffect } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { SetTimerBannerContent } from "../../components/setTimerBanner";
import { Thunk_closeSetTimer } from "../../ducks/thunks";
import type { IRootStackParamList } from "../types";

export function NavModalSetTimer(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{ key: string; name: "setTimerModal"; params: IRootStackParamList["setTimerModal"] }>();
  const { progressId } = route.params;
  const progress = progressId === 0 ? state.storage.progress?.[0] : state.progress[progressId];
  const setTimerModal = progress?.ui?.setTimerModal;

  useEffect(() => {
    const onBeforeRemove = (): void => {
      dispatch(Thunk_closeSetTimer());
    };
    const unsubscribe = navigation.addListener("beforeRemove", onBeforeRemove);
    return unsubscribe;
  }, [navigation, dispatch]);

  const onClose = (): void => {
    navigation.goBack();
  };

  const shouldGoBack = !progress || !setTimerModal;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack || !progress || !setTimerModal) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onClose} maxWidth="480px" isFullWidth>
      <FormSheet>
        <SetTimerBannerContent
          progress={progress}
          settings={state.storage.settings}
          setTimerModal={setTimerModal}
          dispatch={dispatch}
          onClose={onClose}
        />
      </FormSheet>
    </ModalScreenContainer>
  );
}
