import { JSX } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { BottomSheetEditTargetContent } from "../../components/bottomSheetEditTarget";
import { lb } from "lens-shmens";
import { IHistoryRecord } from "../../types";
import type { IRootStackParamList } from "../types";

export function NavModalEditTarget(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "editSetTargetModal";
    params: IRootStackParamList["editSetTargetModal"];
  }>();
  const { progressId } = route.params;

  const progress = progressId === 0 ? state.storage.progress?.[0] : state.progress[progressId];
  const editSetModal = progress?.ui?.editSetModal;

  const onClose = (): void => {
    dispatch({
      type: "UpdateProgress",
      lensRecordings: [lb<IHistoryRecord>().pi("ui").p("editSetModal").record(undefined)],
      desc: "Close edit set modal",
    });
    navigation.goBack();
  };

  if (!progress || !editSetModal) {
    navigation.goBack();
    return <></>;
  }

  return (
    <SheetScreenContainer onClose={onClose}>
      <BottomSheetEditTargetContent
        editSetModal={editSetModal}
        subscription={state.storage.subscription}
        settings={state.storage.settings}
        progress={progress}
        dispatch={dispatch}
        onClose={onClose}
      />
    </SheetScreenContainer>
  );
}
