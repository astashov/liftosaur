import { JSX } from "react";
import { View } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Text } from "../../components/primitives/text";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { n } from "../../utils/math";
import type { IRootStackParamList } from "../types";

export function NavModalSetSplit(): JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "setSplitModal";
    params: IRootStackParamList["setSplitModal"];
  }>();
  const { exercises } = route.params;

  return (
    <ModalScreenContainer onClose={() => navigation.goBack()} shouldShowClose={true}>
      <View className="py-2">
        {exercises.map((exercise) => {
          const totalSets = exercise.strengthSets + exercise.hypertrophySets;
          return (
            <Text
              key={exercise.exerciseName}
              className={`font-bold ${exercise.isSynergist ? "text-text-secondary" : "text-text-primary"}`}
            >
              {exercise.exerciseName}: {n(totalSets)} ({n(exercise.strengthSets)}s, {n(exercise.hypertrophySets)}h)
            </Text>
          );
        })}
      </View>
    </ModalScreenContainer>
  );
}
