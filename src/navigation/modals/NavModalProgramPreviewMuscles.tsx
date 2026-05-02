import { JSX } from "react";
import { ScrollView } from "react-native";
import { Text } from "../../components/primitives/text";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { MusclesView } from "../../components/muscles/musclesView";
import { Locker } from "../../components/locker";
import { Subscriptions_hasSubscription } from "../../utils/subscriptions";
import { Program_evaluate, Program_getProgramDay } from "../../models/program";
import {
  IPoints,
  Muscle_normalizePoints,
  Muscle_getPointsForProgram,
  Muscle_getPointsForDay,
} from "../../models/muscle";
import type { IRootStackParamList } from "../types";

export function NavModalProgramPreviewMuscles(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "programPreviewMusclesModal";
    params: IRootStackParamList["programPreviewMusclesModal"];
  }>();
  const params = route.params;
  const settings = state.storage.settings;
  const subscription = state.storage.subscription;
  const stats = state.storage.stats;

  const previewProgram = state.previewProgram;
  const programs = previewProgram?.showCustomPrograms ? state.storage.programs : state.programs;
  const program = programs?.find((p) => p.id === previewProgram?.id);

  if (!program) {
    navigation.goBack();
    return <></>;
  }

  const evaluatedProgram = Program_evaluate(program, settings);
  let points: IPoints | undefined;
  let name = "";

  if (params.type === "program") {
    points = Muscle_normalizePoints(Muscle_getPointsForProgram(evaluatedProgram, stats, settings));
    name = evaluatedProgram.name;
  } else {
    const programDay = Program_getProgramDay(evaluatedProgram, params.dayIndex + 1);
    if (programDay) {
      points = Muscle_normalizePoints(Muscle_getPointsForDay(evaluatedProgram, programDay, stats, settings));
      name = programDay.name;
    }
  }

  if (!points || !name) {
    navigation.goBack();
    return <></>;
  }

  const title =
    params.type === "program" ? `Muscles for program '${evaluatedProgram.name}'` : `Muscles for day '${name}'`;

  const isLocked = !Subscriptions_hasSubscription(subscription);

  return (
    <ModalScreenContainer
      onClose={() => navigation.goBack()}
      shouldShowClose={true}
      overlay={isLocked ? <Locker topic="Muscles" dispatch={dispatch} blur={8} subscription={subscription} /> : null}
      overlayDetent={0.85}
    >
      <Text className="pb-2 text-xl font-bold text-center">{title}</Text>
      <ScrollView scrollEnabled={!isLocked}>
        <MusclesView settings={settings} points={points} title={evaluatedProgram.name} />
      </ScrollView>
    </ModalScreenContainer>
  );
}
