import React, { useState } from "react";
import { View, Text, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { IDispatch } from "@shared/ducks/types";
import { Thunk_pushScreen } from "@shared/ducks/thunks";
import { Tailwind_colors } from "@shared/utils/tailwindConfig";
import { Button } from "./Button";
import { StorySlider } from "./StorySlider";
import { IconArrowRight } from "./icons/IconArrowRight";
import { IconKettlebell } from "./icons/IconKettlebell";
import { IconWorkoutProgress } from "./icons/IconWorkoutProgress";
import { IconEditor } from "./icons/IconEditor";
import { IconTracker } from "./icons/IconTracker";

interface IProps {
  dispatch: IDispatch;
}

const IMAGE_BASE = `${__HOST__}/images`;

function FirstSlide(): React.ReactElement {
  return (
    <View className="relative flex-col w-full h-full bg-black rounded-2xl overflow-hidden">
      <Image
        source={{ uri: `${IMAGE_BASE}/slide-1-bg.jpg` }}
        className="absolute inset-0 w-full h-full"
        resizeMode="cover"
      />
      <View className="px-8 pt-24">
        <Text className="font-bold text-white" style={{ fontSize: 32, lineHeight: 35 }}>
          The most powerful weightlifting <Text style={{ color: "#946AFF" }}>planner</Text> and{" "}
          <Text style={{ color: "#FF775D" }}>tracker</Text> app
        </Text>
      </View>
      <View className="px-8 py-6">
        <Text className="text-base font-normal text-white">
          Build any weightlifting program using a simple scripting language and track your progress.
        </Text>
      </View>
      <View className="flex-1 items-center justify-center">
        <Image source={{ uri: `${IMAGE_BASE}/logo.svg` }} className="w-24 h-24" resizeMode="contain" />
      </View>
    </View>
  );
}

interface IRestSlideProps {
  bgColor: string;
  borderColor: string;
  headerIcon: React.ReactElement;
  headerText: string;
  headerTextColor: string;
  bodyText: string;
  image: string;
}

function RestSlide(props: IRestSlideProps): React.ReactElement {
  return (
    <View className={`flex-col w-full h-full overflow-hidden border ${props.borderColor} rounded-2xl ${props.bgColor}`}>
      <View className="h-12 px-8" />
      <View className="px-8 flex-row items-center justify-center">
        {props.headerIcon}
        <Text className={`ml-1 font-semibold ${props.headerTextColor}`}>{props.headerText}</Text>
      </View>
      <View className="px-8 py-6">
        <Text className="text-xl font-semibold text-center text-black">{props.bodyText}</Text>
      </View>
      <View className="flex-1 items-center justify-center">
        <Image source={{ uri: `${IMAGE_BASE}/${props.image}.png` }} className="w-full h-full" resizeMode="contain" />
      </View>
    </View>
  );
}

export function ScreenFirst(props: IProps): React.ReactElement {
  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-background-default">
      <View className="flex-1 px-4 pt-16 pb-4">
        <StorySlider
          slides={[
            <FirstSlide key="slide-1" />,
            <RestSlide
              key="slide-2"
              bgColor="bg-purple-100"
              borderColor="border-purplev3-200"
              headerIcon={<IconKettlebell color={Tailwind_colors().purple[600]} />}
              headerText="Weightlifting Programs"
              headerTextColor="text-text-purple"
              bodyText="Start with a pre-built weightlifting program, or create your own."
              image="slide-2-image"
            />,
            <RestSlide
              key="slide-3"
              bgColor="bg-yellow-100"
              borderColor="border-border-cardyellow"
              headerIcon={<IconWorkoutProgress color={Tailwind_colors().yellow[600]} />}
              headerText="Workout Tracker"
              headerTextColor="text-icon-yellow"
              bodyText="Log sets with one tap. Your reps and weight adjust automatically."
              image="slide-3-image"
            />,
            <RestSlide
              key="slide-4"
              bgColor="bg-purple-100"
              borderColor="border-purplev3-200"
              headerIcon={<IconEditor color={Tailwind_colors().purple[600]} />}
              headerText="Program Editor"
              headerTextColor="text-text-purple"
              bodyText="Modify or switch any program anytime to fit your goals."
              image="slide-4-image"
            />,
            <RestSlide
              key="slide-5"
              bgColor="bg-red-100"
              borderColor="border-red-200"
              headerIcon={<IconTracker color={Tailwind_colors().red[600]} />}
              headerText="Workout History"
              headerTextColor="text-text-error"
              bodyText="Track your weekly stats to stay on target!"
              image="slide-5-image"
            />,
          ]}
          duration={5000}
        />
      </View>
      <View className="pb-6 mx-4">
        <Button
          className="w-full flex-row justify-center"
          name="get-started"
          kind="purple"
          onPress={() => props.dispatch(Thunk_pushScreen("units"))}
        >
          <Text className="text-text-alwayswhite font-semibold text-xs">Get started</Text>
          <View className="ml-2">
            <IconArrowRight color="white" />
          </View>
        </Button>
        <View className="mt-2">
          <Button
            className="w-full"
            name="have-account"
            kind="transparent-purple"
            onPress={() => {
              // TODO: account modal
            }}
          >
            I have an account
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
