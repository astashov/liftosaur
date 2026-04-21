import { JSX, useEffect, useMemo } from "react";
import { View, Platform } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ModalEditUpdateScriptContent } from "../../components/editProgramExercise/progressions/modalEditUpdateScript";
import { IPlannerExerciseState } from "../../pages/planner/models/types";
import { Program_evaluate, Program_getFirstProgramExercise } from "../../models/program";
import { IState } from "../../models/state";
import { lb } from "lens-shmens";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import { EditProgramUiHelpers_changeFirstInstance } from "../../components/editProgram/editProgramUi/editProgramUiHelpers";
import type { IRootStackParamList } from "../types";

export function NavModalEditUpdateScript(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "editUpdateScriptModal";
    params: IRootStackParamList["editUpdateScriptModal"];
  }>();
  const { exerciseStateKey, programId } = route.params;

  const plannerState = state.editProgramExerciseStates?.[exerciseStateKey] as IPlannerExerciseState | undefined;

  const plannerDispatch = useMemo(() => {
    if (!plannerState) {
      return undefined;
    }
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
    plannerDispatch?.(lbUi.p("showEditUpdateScriptModal").record(false), "Close edit update script modal");
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

  const content = (
    <ModalEditUpdateScriptContent
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
                e.update = {
                  ...e.update,
                  type: "custom",
                  script: script,
                };
              }
            );
          }),
          "Update script"
        );
      }}
    />
  );

  if (Platform.OS === "web") {
    return (
      <ModalScreenContainer onClose={onClose} isFullWidth isFullHeight>
        {content}
      </ModalScreenContainer>
    );
  }

  return <View className="bg-background-default flex-1 px-4 py-4">{content}</View>;
}
