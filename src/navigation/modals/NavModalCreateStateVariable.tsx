import { JSX, useEffect, useMemo } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ModalCreateStateVariableContent } from "../../components/editProgramExercise/progressions/modalCreateStateVariable";
import { IPlannerExerciseState } from "../../pages/planner/models/types";
import { Program_evaluate, Program_getFirstProgramExercise } from "../../models/program";
import { IState } from "../../models/state";
import { lb } from "lens-shmens";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import { EditProgramUiHelpers_changeFirstInstance } from "../../components/editProgram/editProgramUi/editProgramUiHelpers";
import { Weight_buildAny } from "../../models/weight";
import type { IRootStackParamList } from "../types";

export function NavModalCreateStateVariable(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "createStateVariableModal";
    params: IRootStackParamList["createStateVariableModal"];
  }>();
  const { exerciseStateKey, programId } = route.params;

  const plannerState = state.editProgramExerciseStates?.[exerciseStateKey] as IPlannerExerciseState | undefined;

  const plannerDispatch = useMemo(() => {
    if (!plannerState) return undefined;
    return buildPlannerDispatch(
      dispatch,
      lb<IState>().p("editProgramExerciseStates").p(exerciseStateKey),
      plannerState
    );
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
    plannerDispatch?.(lbUi.p("showAddStateVariableModal").record(false), "Close add state variable modal");
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
    <ModalScreenContainer onClose={onClose}>
      <ModalCreateStateVariableContent
        onClose={onClose}
        onCreate={(name, type, isUserPrompted) => {
          plannerDispatch!(
            lbProgram.recordModify((program) => {
              return EditProgramUiHelpers_changeFirstInstance(
                program,
                plannerExercise!,
                state.storage.settings,
                true,
                (e) => {
                  const st = e.progress?.state;
                  const stateMetadata = e.progress?.stateMetadata;
                  if (st) {
                    st[name] = type === "number" ? 0 : Weight_buildAny(0, type);
                  }
                  if (stateMetadata && isUserPrompted) {
                    stateMetadata[name] = { userPrompted: true };
                  }
                }
              );
            }),
            "Add state variable"
          );
        }}
      />
    </ModalScreenContainer>
  );
}
