import { JSX } from "react";
import { useNavigation, useRoute, StackActions } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { ModalCreateProgramContent } from "../../components/modalCreateProgram";
import { EditProgram_create, EditProgram_createFromHistoryRecord } from "../../models/editProgram";
import { resolveAdhocRecord } from "../utils";
import type { IRootStackParamList } from "../types";

export function NavModalCreateProgram(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "createProgramModal";
    params: IRootStackParamList["createProgramModal"];
  }>();
  const record = resolveAdhocRecord(
    state,
    route.params
      ? { progressId: route.params.adhocProgressId, historyRecordId: route.params.adhocHistoryRecordId }
      : undefined
  );

  const onClose = (): void => {
    navigation.goBack();
  };

  const onSelect = (name: string): void => {
    if (record != null) {
      EditProgram_createFromHistoryRecord(dispatch, name, record, state.storage.settings);
      navigation.dispatch(StackActions.pop(2));
    } else {
      EditProgram_create(dispatch, name);
      onClose();
    }
  };

  return (
    <ModalScreenContainer onClose={onClose}>
      <FormSheet>
        <ModalCreateProgramContent onSelect={onSelect} onClose={onClose} />
      </FormSheet>
    </ModalScreenContainer>
  );
}
