import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";

export function HelpAccount(): JSX.Element {
  return (
    <View>
      <Text className="pb-2 text-xl font-semibold">Settings - Account</Text>
      <Text className="pb-2 text-sm">You can log in and log out on this screen.</Text>
      <Text className="pb-2 text-sm">
        For now, we only support <Text className="text-sm font-bold">login via Google</Text>.
      </Text>
      <Text className="pb-2 text-sm">
        After you log in, your data will be synced to the cloud, so even if you lose your phone, your progress won't be
        lost.
      </Text>
    </View>
  );
}
