import { JSX } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { BottomSheetEditProgramV2Content } from "../../components/bottomSheetEditProgramV2";
import { Program_getProgram } from "../../models/program";
import { Thunk_generateAndCopyLink, Thunk_fetchRevisions } from "../../ducks/thunks";
import { UrlUtils_build } from "../../utils/url";
import { ClipboardUtils_copy } from "../../utils/clipboard";
import { navigationRef } from "../navigationRef";
import type { IRootStackParamList } from "../types";

declare let __HOST__: string;

export function NavModalEditProgramMenu(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "editProgramMenuModal";
    params: IRootStackParamList["editProgramMenuModal"];
  }>();
  const { programId } = route.params;

  const program = Program_getProgram(state, programId);

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose} noPaddings>
      <BottomSheetEditProgramV2Content
        isAffiliateEnabled={!!state.storage.settings.affiliateEnabled}
        isLoadingRevisions={false}
        isLoggedIn={!!state.user?.id}
        onExportProgramToLink={() => {
          const url = UrlUtils_build(`/user/p/${programId}`, __HOST__);
          ClipboardUtils_copy(url.toString());
          alert(`Copied link to the clipboard: ${url}`);
          onClose();
        }}
        onShareProgramToLink={() => {
          if (program) {
            dispatch(
              Thunk_generateAndCopyLink(program, state.storage.settings, (url) => {
                alert(`Copied link to the clipboard: ${url}`);
              })
            );
          }
          onClose();
        }}
        onGenerateProgramImage={() => {
          onClose();
          navigationRef.navigate("programImageExportModal", { programId });
        }}
        onLoadRevisions={() => {
          dispatch(
            Thunk_fetchRevisions(programId, () => {
              onClose();
              navigationRef.navigate("programRevisionsModal", { programId });
            })
          );
        }}
        onClose={onClose}
      />
    </ModalScreenContainer>
  );
}
