import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { PlannerCodeBlock } from "../../pages/planner/components/plannerCodeBlock";
import { IconGraphsE } from "../icons/iconGraphsE";
import { IconMusclesD } from "../icons/iconMusclesD";
import { IconMusclesW } from "../icons/iconMusclesW";
import { Link } from "../link";
import { IconDoc } from "../icons/iconDoc";

export function HelpEditProgramV2(): JSX.Element {
  const script = "Squat / 3x3-5\nRomanian Deadlift / 3x8";
  const script2 = "Squat / 3x3-5 65%\nRomanian Deadlift / 3x8 150lb";

  return (
    <View>
      <Text className="pb-2 text-xl font-semibold">Edit Program</Text>
      <Text className="mb-2 text-sm">
        In Liftosaur, you need to build a weightlifting program in order to do workouts. This is the screen where you
        can do it. You can build your weightlifting program and ensure you have proper{" "}
        <Text className="text-sm font-bold">weekly volume per muscle group</Text>, and balance it with the{" "}
        <Text className="text-sm font-bold">time you spend in a gym</Text>. You can build multi-week programs, plan your
        mesocycles, deload weeks, testing 1RM weeks, and see the weekly undulation of volume and intensity of each
        exercise on a graph.
      </Text>
      <View className="flex-row flex-wrap items-center mb-2">
        <Text className="text-sm">
          The source of truth for a program is the program text. It uses a special syntax to describe programs called{" "}
          <Text className="text-sm font-bold">Liftoscript</Text>, which looks kinda similar to how you would write a
          program on paper. By default, in the app there's UI to edit the program, but it really just edits the program
          text under the hood. To access all the features (editing progressions, descriptions, etc) - you can switch to
          the plain text mode (by clicking on{" "}
        </Text>
        <IconDoc width={14} height={14} />
        <Text className="text-sm">)</Text>
      </View>
      <View className="flex-row flex-wrap items-center mb-2">
        <Text className="text-sm">
          Set the program name, create weeks and days. Then, either create exercises through UI, or switch to the plain
          text mode (by tapping on{" "}
        </Text>
        <IconDoc width={14} height={14} />
        <Text className="text-sm">
          ), type the list of exercises for each day, putting each exercise on a new line, along with the number of sets
          and reps after slash (
          <Text className="text-sm" style={{ fontFamily: "Courier" }}>
            /
          </Text>
          ) character, like this:
        </Text>
      </View>
      <View className="px-4 py-2 my-1 mb-2 bg-background-default border rounded-md border-border-neutral">
        <PlannerCodeBlock script={script} />
      </View>
      <Text className="mb-2 text-sm">
        You can specify weight - either in absolute units (<Text className="text-sm font-bold">kg</Text> or{" "}
        <Text className="text-sm font-bold">lb</Text>) or as a percentage of your 1RM (One Rep Max - the maximum weight
        you can lift for one repetition):
      </Text>
      <View className="px-4 py-2 my-1 mb-2 bg-background-default border rounded-md border-border-neutral">
        <PlannerCodeBlock script={script2} />
      </View>
      <Text className="mb-2 text-sm">
        Autocomplete will help you with the exercise names. You can also create custom exercises if they're missing in
        the library.
      </Text>
      <View className="flex-row flex-wrap items-center mb-2">
        <Text className="text-sm">The </Text>
        <IconMusclesW size={14} />
        <Text className="text-sm">
          {" "}
          opens <Text className="text-sm font-bold">Weekly Stats</Text>, where you can see the number of sets per week
          per muscle group, whether you're in the recommended range (indicated by color), strength/hypertrophy split,
          and if you tap the numbers - you'll see what exercises contribute to that number, and how much.
        </Text>
      </View>
      <View className="flex-row flex-wrap items-center mb-2">
        <Text className="text-sm">Same thing exists for the day - </Text>
        <IconMusclesD size={14} />
        <Text className="text-sm">, and you can also see exercise details and undulation graphs by tapping on </Text>
        <IconGraphsE width={14} height={14} />
        <Text className="text-sm">.</Text>
      </View>
      <Text className="mb-2 text-sm">
        The exercise syntax supports RPEs (Rate of Perceived Exertion - a subjective measure of how hard the set was),
        rest timers, various progressive overload types, etc. It's very powerful, read more about all the features{" "}
        <Link className="text-sm" href="https://www.liftosaur.com/doc">
          in the docs
        </Link>
        !
      </Text>
    </View>
  );
}
