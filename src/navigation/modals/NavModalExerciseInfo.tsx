import { JSX } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ExerciseImage } from "../../components/exerciseImage";
import type { IRootStackParamList } from "../types";

export function NavModalExerciseInfo(): JSX.Element {
  const { state } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "exerciseInfoModal";
    params: IRootStackParamList["exerciseInfoModal"];
  }>();
  const { exerciseType } = route.params;

  return (
    <ModalScreenContainer onClose={() => navigation.goBack()} isFullWidth>
      <ExerciseImage settings={state.storage.settings} exerciseType={exerciseType} size="large" />
    </ModalScreenContainer>
  );
}
