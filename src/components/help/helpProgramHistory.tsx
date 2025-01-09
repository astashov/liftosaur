import { View } from "react-native";
import { LftText } from "../lftText"; // Adjust the import path as necessary

export function HelpProgramHistory(): JSX.Element {
  return (
    <View>
      <LftText className="pb-2 text-xl">Workout History</LftText>
      <LftText className="pb-2">
        This the main screen. It lists the <LftText className="font-bold">next workout</LftText> of the selected
        program, as well as the <LftText className="font-bold">history of your workouts</LftText>
      </LftText>
      <LftText className="pb-2">
        Each history item shows the date, program, day, exercises, reps and{" "}
        <LftText className="font-bold">max weight</LftText> for that exercise.{" "}
        <LftText className="text-redv2-main">Red</LftText> reps are unsuccessful ones, i.e. completed reps were less
        than required reps. <LftText className="text-greenv2-main">Green</LftText> reps mean they were successful.
        There's also duration of a workout (hours and minutes)
      </LftText>
    </View>
  );
}
