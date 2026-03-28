import React from "react";
import { View, Text, Pressable, Image, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { IDispatch } from "@shared/ducks/types";
import { Thunk_pushScreen } from "@shared/ducks/thunks";
import { emptyProgramId, Program_selectProgram } from "@shared/models/program";
import { IconDoc } from "./icons/IconDoc";
import { IconEditSquare } from "./icons/IconEditSquare";
import { IconLink } from "./icons/IconLink";
import { IconEquipmentKettlebell } from "./icons/IconEquipmentKettlebell";
import { IconChevronRight } from "./icons/IconChevronRight";
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";

interface IProps {
  dispatch: IDispatch;
}

const IMAGE_BASE = `${__HOST__}/images`;

export function ScreenProgramSelect(props: IProps): React.ReactElement {
  const options = [
    {
      key: "builtin",
      icon: <IconDoc width={24} height={24} />,
      title: "Pick a built-in program",
      description: "Choose from popular routines like 5/3/1, GZCLP, and more",
      onPress: () => props.dispatch(Thunk_pushScreen("programs")),
    },
    {
      key: "create",
      icon: <IconEditSquare />,
      title: "Create a program",
      description: "Build your own custom routine from scratch",
      onPress: () => {
        // TODO: create program modal
      },
    },
    {
      key: "import",
      icon: <IconLink size={24} />,
      title: "Import from link",
      description: "Paste a link from the program web editor",
      onPress: () => {
        // TODO: import from link modal
      },
    },
    {
      key: "adhoc",
      icon: <IconEquipmentKettlebell size={24} />,
      title: "Go without program",
      description: "You can run adhoc workouts, and build the program along the way",
      onPress: () => Program_selectProgram(props.dispatch, emptyProgramId),
    },
  ];

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-background-default">
      <ScrollView className="flex-1 px-4 pt-8 pb-4">
        <View className="p-4 items-center">
          <Image source={{ uri: `${IMAGE_BASE}/dinoprogramselect.png` }} className="h-52 w-52" resizeMode="contain" />
        </View>
        <View className="px-2 -mt-1">
          <Text className="mb-2 text-xl font-bold text-center text-text-primary">Choose your program</Text>
          <Text className="mb-6 text-sm text-center text-text-secondary">
            How would you like to set up your training?
          </Text>

          <View className="gap-3">
            {options.map((opt) => (
              <Pressable
                key={opt.key}
                className="flex-row items-center w-full gap-3 px-4 py-4 border rounded-xl bg-background-subtlecardpurple border-border-cardpurple"
                onPress={opt.onPress}
              >
                <View>{opt.icon}</View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-text-primary">{opt.title}</Text>
                  <Text className="text-xs text-text-secondary">{opt.description}</Text>
                </View>
                <IconChevronRight color={Tailwind_semantic().text.secondary} />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
