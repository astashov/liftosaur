import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";

export function HelpTimers(): JSX.Element {
  return (
    <View>
      <Text className="pb-2 text-xl font-semibold">Settings - Timers</Text>
      <Text className="pb-2 text-sm">You can specify warmup and regular workout timers here.</Text>
      <Text className="pb-2 text-sm">
        Warmup timer is fired after finishing a warmup set, and regular workout timer - after finishing a regular set.
      </Text>
      <Text className="pb-2 text-sm">
        You'll see the timer on the workout screen. When it times out on Android, it will make a sound and send a
        notification. Unfortunately, we don't support the sound/notification on iOS yet.
      </Text>
    </View>
  );
}
