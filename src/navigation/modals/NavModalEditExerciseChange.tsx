import { JSX, useCallback, useEffect } from "react";
import { View } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { Text } from "../../components/primitives/text";
import { Button } from "../../components/button";
import { IState } from "../../models/state";
import { lb } from "lens-shmens";
import { IPlannerState } from "../../pages/planner/models/types";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import { pickerStateFromPlannerExercise } from "../../components/editProgram/editProgramUtils";
import type { IRootStackParamList } from "../types";

export function NavModalEditExerciseChange(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "editExerciseChangeModal";
    params: IRootStackParamList["editExerciseChangeModal"];
  }>();
  const { programId } = route.params;
  const settings = state.storage.settings;

  const plannerState = state.editProgramStates?.[programId];
  const lbUi = lb<IPlannerState>().p("ui");
  const plannerDispatch = useCallback(
    plannerState
      ? buildPlannerDispatch(dispatch, lb<IState>().p("editProgramStates").p(programId), plannerState)
      : () => {},
    [dispatch, programId, plannerState]
  );

  const editExerciseModal = plannerState?.ui?.editExerciseModal;

  const onClose = (): void => {
    if (plannerState) {
      plannerDispatch(lbUi.p("editExerciseModal").record(undefined), "Close edit exercise modal");
    }
    navigation.goBack();
  };

  const shouldGoBack = !plannerState || !editExerciseModal;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true}>
      <Text className="mb-2 text-lg font-semibold text-center">Change Exercise</Text>
      <View className="flex-row" style={{ gap: 16 }}>
        <View>
          <Button
            name="edit-exercise-change-one"
            data-cy="edit-exercise-change-one"
            testID="edit-exercise-change-one"
            kind="purple"
            onClick={() => {
              plannerDispatch(
                [
                  lbUi.p("editExerciseModal").record(undefined),
                  lbUi.p("exercisePicker").record({
                    state: pickerStateFromPlannerExercise(settings, editExerciseModal!.plannerExercise),
                    exerciseKey: editExerciseModal!.plannerExercise.key,
                    dayData: editExerciseModal!.plannerExercise.dayData,
                    change: "one",
                  }),
                ],
                "Change exercise for one instance"
              );
              navigation.goBack();
            }}
          >
            Change only for this week/day
          </Button>
        </View>
        <View>
          <Button
            name="edit-exercise-change-all"
            data-cy="edit-exercise-change-all"
            testID="edit-exercise-change-all"
            kind="purple"
            onClick={() => {
              plannerDispatch(
                [
                  lbUi.p("editExerciseModal").record(undefined),
                  lbUi.p("exercisePicker").record({
                    state: pickerStateFromPlannerExercise(settings, editExerciseModal!.plannerExercise),
                    exerciseKey: editExerciseModal!.plannerExercise.key,
                    dayData: editExerciseModal!.plannerExercise.dayData,
                    change: "all",
                  }),
                ],
                "Change exercise for all instances"
              );
              navigation.goBack();
            }}
          >
            Change across whole program
          </Button>
        </View>
      </View>
    </ModalScreenContainer>
  );
}
