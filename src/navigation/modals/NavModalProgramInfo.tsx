import { JSX, useEffect } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { ModalProgramInfoContent } from "../../components/modalProgramInfo";
import { Program_cloneProgram, Program_previewProgram } from "../../models/program";
import { Settings_doesProgramHaveUnset1RMs } from "../../models/settings";
import { Thunk_postevent, Thunk_pushScreen } from "../../ducks/thunks";
import type { IRootStackParamList } from "../types";

export function NavModalProgramInfo(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "programInfoModal";
    params: IRootStackParamList["programInfoModal"];
  }>();
  const { programId, hasCustomPrograms } = route.params;
  const settings = state.storage.settings;
  const program = state.programs.find((p) => p.id === programId);

  const onClose = (): void => {
    navigation.goBack();
  };

  const shouldGoBack = !program;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  // Per-program browse signal - the list row tap has no durable log, so this is the only way to
  // see which built-in programs users open vs actually add (see onSelect below).
  useEffect(() => {
    if (program?.id) {
      dispatch(Thunk_postevent("program-info-open", { programId: program.id }));
    }
  }, [programId]);

  if (shouldGoBack) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true}>
      <FormSheet>
        <ModalProgramInfoContent
          program={program!}
          hasCustomPrograms={hasCustomPrograms}
          settings={settings}
          onClose={onClose}
          onPreview={() => {
            onClose();
            setTimeout(() => {
              Program_previewProgram(dispatch, program!.id, false);
            }, 50);
          }}
          onSelect={() => {
            if (program?.id) {
              dispatch(Thunk_postevent("program-clone", { programId: program.id }));
            }
            Program_cloneProgram(dispatch, program!, settings);
            onClose();
            setTimeout(() => {
              if (Settings_doesProgramHaveUnset1RMs(program!, settings)) {
                dispatch(Thunk_pushScreen("onerms"));
              } else {
                dispatch(Thunk_pushScreen("main", undefined, { tab: "home" }));
              }
            }, 50);
          }}
        />
      </FormSheet>
    </ModalScreenContainer>
  );
}
