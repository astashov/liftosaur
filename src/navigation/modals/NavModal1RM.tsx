import { JSX, useEffect } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ExerciseRM } from "../../components/exerciseRm";
import { Exercise_get, Exercise_toKey } from "../../models/exercise";
import { Weight_build } from "../../models/weight";
import { IState, updateState } from "../../models/state";
import { Progress_lbProgress } from "../../models/progress";
import { lb } from "lens-shmens";
import type { IRootStackParamList } from "../types";

export function NavModal1RM(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{ key: string; name: "rm1Modal"; params: IRootStackParamList["rm1Modal"] }>();
  const { progressId } = route.params;

  const progress = progressId === 0 ? state.storage.progress?.[0] : state.progress[progressId];
  const exerciseType = progress?.ui?.rm1Modal?.exerciseType;

  const onClose = (): void => {
    updateState(
      dispatch,
      [Progress_lbProgress(progressId).pi("ui").p("rm1Modal").record(undefined)],
      "Close 1RM modal"
    );
    navigation.goBack();
  };

  const shouldGoBack = !progress || !exerciseType;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack || !exerciseType) {
    return <></>;
  }

  const exercise = Exercise_get(exerciseType, state.storage.settings.exercises);

  return (
    <ModalScreenContainer onClose={onClose} isFullWidth>
      <ExerciseRM
        name="1 Rep Max"
        rmKey="rm1"
        exercise={exercise}
        settings={state.storage.settings}
        onEditVariable={(value) => {
          updateState(
            dispatch,
            [
              lb<IState>()
                .p("storage")
                .p("settings")
                .p("exerciseData")
                .recordModify((data) => {
                  const k = Exercise_toKey(exercise);
                  return { ...data, [k]: { ...data[k], rm1: Weight_build(value, state.storage.settings.units) } };
                }),
            ],
            "Update 1RM from modal"
          );
        }}
      />
    </ModalScreenContainer>
  );
}
