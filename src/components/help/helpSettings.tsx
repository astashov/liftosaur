import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";

export function HelpSettings(): JSX.Element {
  return (
    <View>
      <Text className="pb-2 text-xl font-semibold">Settings</Text>
      <Text className="pb-2 text-sm">
        This is the main settings screen. The settings are grouped by a common theme (Account, Workout, etc). Some
        settings are only visible if you're logged in.
      </Text>
      <Text className="pb-2 text-sm">
        Under <Text className="text-sm font-bold">Account</Text> section, you can go to the account screen, and log in
        there. For now, we only support <Text className="text-sm font-bold">login via Google</Text>. After you log in,
        your data will be synced to the cloud, so even if you lose your phone, your progress won't be lost.
      </Text>
      <Text className="pb-2 text-sm">
        Make sure to set your <Text className="text-sm font-bold">Available Equipment</Text>. The plates you specify
        there would be used when calculating weight for exercises, and the weight would be round up so that you can get
        it with your available equipment. Like if you have only <Text className="text-sm font-bold">4x45lb</Text>{" "}
        plates and a barbell, you won't be able to get <Text className="text-sm font-bold">150lb</Text>, so the app
        would convert it to <Text className="text-sm font-bold">135lb (bar + 2x45lb plates)</Text> - the weight you can
        actually get with your available plates.
      </Text>
      <Text className="pb-2 text-sm">
        In <Text className="text-sm font-bold">Import / Export</Text> section, you can import and export all your
        stored app data to a JSON file. You can use it to backup your data, or to transfer it to another device (e.g.
        if you don't want to create an account and sync data to the cloud). You can also import programs there (which
        you previously exported on the "Edit Program" screen).
      </Text>
      <Text className="pb-2 text-sm">
        You can also export your history to CSV file, and then open it e.g. in Excel, if you want to analyze your data
        there.
      </Text>
    </View>
  );
}
