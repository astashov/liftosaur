import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { IDispatch } from "@shared/ducks/types";
import type { ISettings } from "@shared/types";
import { Thunk_pushScreen } from "@shared/ducks/thunks";
import { updateSettings } from "@shared/models/state";
import { lb } from "lens-shmens";
import { Button } from "./Button";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
}

const IMAGE_BASE = `${__HOST__}/images`;

export function ScreenUnitSelector(props: IProps): React.ReactElement {
  const selectedCls = "bg-button-primarybackground border-button-primarybackground";
  const unselectedCls = "bg-background-default border-border-neutral";

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-background-default">
      <View className="flex-1 px-4 pt-16 pb-4">
        <View className="w-full h-full border border-border-cardyellow rounded-2xl bg-background-cardyellow">
          <View className="p-4 items-center">
            <Image source={{ uri: `${IMAGE_BASE}/dinounit.png` }} className="h-48 w-48" resizeMode="contain" />
          </View>
          <Text className="px-6 pt-4 text-2xl font-semibold text-center text-text-primary">Pick your units</Text>
          <Text className="px-6 py-4 text-base text-center text-text-primary">
            Your chosen units will be the default, but you can override them or change them in{" "}
            <Text className="font-bold">Settings</Text> or <Text className="font-bold">per equipment</Text> anytime.
          </Text>
          <View className="flex-row px-6">
            <Pressable
              className={`flex-1 px-2 py-3 border rounded-l-lg items-center ${props.settings.units === "lb" ? selectedCls : unselectedCls}`}
              onPress={() => {
                updateSettings(props.dispatch, lb<ISettings>().p("units").record("lb"), "Set units to pounds");
              }}
            >
              <Text
                className={`text-sm font-semibold ${props.settings.units === "lb" ? "text-button-primarylabel" : "text-text-purple"}`}
              >
                Pounds (lb)
              </Text>
            </Pressable>
            <Pressable
              className={`flex-1 px-2 py-3 border rounded-r-lg items-center ${props.settings.units === "kg" ? selectedCls : unselectedCls}`}
              onPress={() => {
                updateSettings(props.dispatch, lb<ISettings>().p("units").record("kg"), "Set units to kilograms");
              }}
            >
              <Text
                className={`text-sm font-semibold ${props.settings.units === "kg" ? "text-button-primarylabel" : "text-text-purple"}`}
              >
                Kilograms (kg)
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
      <View className="pb-16 mx-4 mb-2">
        <Button
          className="w-full"
          name="unit-continue"
          kind="purple"
          onPress={() => props.dispatch(Thunk_pushScreen("setupequipment"))}
        >
          Continue
        </Button>
      </View>
    </SafeAreaView>
  );
}
