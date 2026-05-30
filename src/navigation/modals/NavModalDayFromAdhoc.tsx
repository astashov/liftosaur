import { JSX, useEffect } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { ModalDayFromAdhocContent } from "../../components/modalDayFromAdhoc";
import { navigateToModal } from "../navigationService";
import { resolveAdhocRecord } from "../utils";
import type { IRootStackParamList } from "../types";

export function NavModalDayFromAdhoc(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "dayFromAdhocModal";
    params: IRootStackParamList["dayFromAdhocModal"];
  }>();
  const { progressId, historyRecordId } = route.params;

  const record = resolveAdhocRecord(state, { progressId, historyRecordId });

  const onClose = (): void => {
    navigation.goBack();
  };

  const shouldGoBack = !record;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack || !record) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onClose} isFullWidth isFullHeight>
      <FormSheet header="Program day from Adhoc workout">
        <ModalDayFromAdhocContent
          initialCurrentProgramId={record.programId}
          stats={state.storage.stats}
          record={record}
          dispatch={dispatch}
          allPrograms={state.storage.programs}
          settings={state.storage.settings}
          onCreateProgram={() =>
            navigateToModal("createProgramModal", {
              adhocProgressId: progressId,
              adhocHistoryRecordId: historyRecordId,
            })
          }
          onClose={onClose}
        />
      </FormSheet>
    </ModalScreenContainer>
  );
}
