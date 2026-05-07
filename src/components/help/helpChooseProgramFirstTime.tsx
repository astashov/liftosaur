import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { Link } from "../link";

export function HelpChooseProgramFirstTime(): JSX.Element {
  return (
    <View>
      <Text className="pb-2 text-xl font-semibold">Choose a program</Text>
      <Text className="pb-2 text-sm">
        This screen lists the available pre-built programs, and gives you an option to create your own.
      </Text>
      <Text className="pb-2 text-sm">
        If you're a beginner, consider starting with the pre-built program rather than creating your own.
      </Text>
      <Text className="pb-2 text-sm">
        A program defines the list of workout days and the exercises for each day. It also defines the logic for
        increasing or decreasing reps and weights over time, depending on your workout performance.
      </Text>
      <Text className="pb-2 text-sm">
        After you pick a program, you can modify it in any way you want. The app is very flexible, you can change the
        reps/weights logic, using a special scripting language called{" "}
        <Link className="text-sm" href="/doc">
          Liftoscript
        </Link>
      </Text>
    </View>
  );
}
