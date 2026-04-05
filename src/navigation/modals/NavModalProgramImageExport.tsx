import { JSX, useEffect } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { useAppContext } from "../../components/appContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ModalPlannerPictureExportContent } from "../../pages/planner/components/modalPlannerPictureExport";
import type { IRootStackParamList } from "../types";

export function NavModalProgramImageExport(): JSX.Element {
  const { state } = useAppState();
  const { service } = useAppContext();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "programImageExportModal";
    params: IRootStackParamList["programImageExportModal"];
  }>();
  const { programId } = route.params;

  const plannerState = state.editProgramStates?.[programId];
  const program = plannerState?.current.program;

  const onClose = (): void => {
    navigation.goBack();
  };

  const shouldGoBack = !program;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack || !program) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onClose} noPaddings>
      <ModalPlannerPictureExportContent
        settings={state.storage.settings}
        userId={state.user?.id}
        client={service.client}
        isChanged={false}
        program={program}
        onClose={onClose}
      />
    </ModalScreenContainer>
  );
}
