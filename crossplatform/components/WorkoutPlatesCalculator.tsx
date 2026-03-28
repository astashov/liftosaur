import type { JSX } from "react";
import { View, Text } from "react-native";
import type { IDispatch } from "@shared/ducks/types";
import type { IHistoryEntry, ISettings, ISubscription, IWeight } from "@shared/types";
import { Subscriptions_hasSubscription } from "@shared/utils/subscriptions";
import { Weight_eq, Weight_calculatePlates, Weight_formatOneSide } from "@shared/models/weight";
import { WorkoutExerciseUtils_getBgColor100 } from "@shared/utils/workoutExerciseUtils";
import { LinkButton } from "./LinkButton";
import { IconEquipmentBarbell } from "./icons/IconEquipmentBarbell";
import { Thunk_pushScreen } from "@shared/ducks/thunks";
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";

interface IProps {
  entry: IHistoryEntry;
  weight: IWeight;
  subscription: ISubscription;
  settings: ISettings;
  dispatch: IDispatch;
}

export function WorkoutPlatesCalculator(props: IProps): JSX.Element {
  const isSubscribed = Subscriptions_hasSubscription(props.subscription);
  const { plates, totalWeight: weight } = Weight_calculatePlates(
    props.weight,
    props.settings,
    props.weight.unit,
    props.entry.exercise
  );
  const bgColor = WorkoutExerciseUtils_getBgColor100(props.entry.sets, false);

  return (
    <View className={`my-1 self-start rounded-lg ${bgColor} p-1`}>
      <View className="flex-row items-center py-1 pl-1 pr-4">
        <IconEquipmentBarbell size={20} color={Tailwind_semantic().text.secondary} />
        <View className="ml-2">
          {isSubscribed ? (
            <Text className="text-xs text-text-secondary">
              <Text>Plates: </Text>
              <Text
                className={`font-semibold ${Weight_eq(weight, props.weight) ? "text-text-primary" : "text-text-error"}`}
              >
                {plates.length > 0 ? Weight_formatOneSide(props.settings, plates, props.entry.exercise) : "None"}
              </Text>
            </Text>
          ) : (
            <LinkButton
              name="see-plates-for-each-side"
              onPress={() => props.dispatch(Thunk_pushScreen("subscription"))}
            >
              See plates for each side
            </LinkButton>
          )}
        </View>
      </View>
    </View>
  );
}
