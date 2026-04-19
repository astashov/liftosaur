import { JSX, memo } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { Svg, Path } from "./primitives/svg";
import { IHistoryEntry, ISettings, ISubscription, IWeight } from "../types";
import { Weight_calculatePlates, Weight_eq, Weight_formatOneSide } from "../models/weight";
import { Subscriptions_hasSubscription } from "../utils/subscriptions";
import { WorkoutExerciseUtils_getBgColor100 } from "../utils/workoutExerciseUtils";
import { LinkButton } from "./linkButton";
import { IDispatch } from "../ducks/types";
import { Thunk_pushScreen } from "../ducks/thunks";

interface IWorkoutPlatesCalculatorProps {
  entry: IHistoryEntry;
  weight: IWeight;
  subscription: ISubscription;
  settings: ISettings;
  dispatch: IDispatch;
}

function BarbellIcon(): JSX.Element {
  return (
    <Svg width={17} height={14} viewBox="0 0 17 14" fill="none">
      <Path d="M5.44872 6.10254H0V7.62818H5.44872V6.10254Z" fill="#28839F" />
      <Path d="M8.2078 0H9.92114V13.7308H8.2078V0Z" fill="#28839F" />
      <Path d="M10.4142 1.42163H12.1275V12.3092H10.4142V1.42163Z" fill="#28839F" />
      <Path d="M12.6206 2.82593H14.3339V10.9049H12.6206V2.82593Z" fill="#28839F" />
      <Path d="M14.7886 6.11975V7.61072H15.8813H15.9073H17V6.11975H15.9073H15.8813H14.7886Z" fill="#28839F" />
      <Path d="M6.00144 0H7.71478V13.7308H6.00144V0Z" fill="#28839F" />
    </Svg>
  );
}

function WorkoutPlatesCalculatorInner(props: IWorkoutPlatesCalculatorProps): JSX.Element {
  const isSubscribed = Subscriptions_hasSubscription(props.subscription);
  const { plates, totalWeight: weight } = Weight_calculatePlates(
    props.weight,
    props.settings,
    props.weight.unit,
    props.entry.exercise
  );
  const isPlatesMatch = Weight_eq(weight, props.weight);
  return (
    <View className="self-start my-1">
      <View
        className={`p-1 flex-row items-center ${WorkoutExerciseUtils_getBgColor100(props.entry.sets, false)} rounded-lg`}
      >
        <View className="px-2">
          <BarbellIcon />
        </View>
        <View className="py-1 pr-4">
          {isSubscribed ? (
            <Text>
              <Text className="text-sm text-text-secondary">Plates: </Text>
              <Text
                className={`text-sm font-semibold ${isPlatesMatch ? "text-text-primary" : "text-text-error"}`}
                data-cy="plates-list"
              >
                {plates.length > 0 ? Weight_formatOneSide(props.settings, plates, props.entry.exercise) : "None"}
              </Text>
            </Text>
          ) : (
            <LinkButton
              name="see-plates-for-each-side"
              onClick={() => props.dispatch(Thunk_pushScreen("subscription"))}
            >
              See plates for each side
            </LinkButton>
          )}
        </View>
      </View>
    </View>
  );
}

export const WorkoutPlatesCalculator = memo(WorkoutPlatesCalculatorInner);
