import { JSX, useEffect, useMemo } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ModalEditProgressScriptContent } from "../../components/editProgramExercise/progressions/modalEditProgressScript";
import { IPlannerExerciseState } from "../../pages/planner/models/types";
import { Program_evaluate, Program_getFirstProgramExercise } from "../../models/program";
import { IState } from "../../models/state";
import { lb } from "lens-shmens";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import { EditProgramUiHelpers_changeFirstInstance } from "../../components/editProgram/editProgramUi/editProgramUiHelpers";
import type { IRootStackParamList } from "../types";

export function NavModalEditProgressScript(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "editProgressScriptModal";
    params: IRootStackParamList["editProgressScriptModal"];
  }>();
  const { exerciseStateKey, programId } = route.params;

  const plannerState = state.editProgramExerciseStates?.[exerciseStateKey] as IPlannerExerciseState | undefined;

  const plannerDispatch = useMemo(() => {
    if (!plannerState) return undefined;
    return buildPlannerDispatch(dispatch, lb<IState>().p("editProgramExerciseStates").p(exerciseStateKey), plannerState);
  }, [dispatch, exerciseStateKey, plannerState]);

  const evaluatedProgram = plannerState
    ? Program_evaluate(plannerState.current.program, state.storage.settings)
    : undefined;

  const exerciseKey = exerciseStateKey.startsWith(programId + "_")
    ? exerciseStateKey.slice(programId.length + 1)
    : undefined;
  const plannerExercise = Program_getFirstProgramExercise(evaluatedProgram, exerciseKey);

  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  const lbUi = lb<IPlannerExerciseState>().pi("ui");

  const onClose = (): void => {
    plannerDispatch?.(lbUi.p("showEditProgressScriptModal").record(false), "Close edit progress script modal");
    navigation.goBack();
  };

  const shouldGoBack = !plannerState || !plannerDispatch || !plannerExercise;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onClose} isFullWidth isFullHeight>
      <ModalEditProgressScriptContent
        settings={state.storage.settings}
        plannerExercise={plannerExercise!}
        onClose={onClose}
        onChange={(script) => {
          plannerDispatch!(
            lbProgram.recordModify((program) => {
              return EditProgramUiHelpers_changeFirstInstance(
                program,
                plannerExercise!,
                state.storage.settings,
                true,
                (e) => {
                  e.progress = {
                    ...e.progress,
                    type: "custom",
                    state: e.progress?.state ?? {},
                    stateMetadata: e.progress?.stateMetadata ?? {},
                    script: script,
                  };
                }
              );
            }),
            "Update progress script"
          );
        }}
      />
    </ModalScreenContainer>
  );
}
