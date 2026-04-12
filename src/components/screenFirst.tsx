import { JSX, ReactNode, useEffect, useRef } from "react";
import { View, Image, Animated, Easing } from "react-native";
import { SvgUri } from "react-native-svg";
import { Text } from "./primitives/text";
import { Thunk_pushScreen } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { useNavOptions } from "../navigation/useNavOptions";
import { Button } from "./button";
import { IconArrowRight } from "./icons/iconArrowRight";
import StorySlider from "./storySlider";
import { IconKettlebell } from "./icons/iconKettlebell";
import { Tailwind_colors } from "../utils/tailwindConfig";
import { IconWorkoutProgress } from "./icons/iconWorkoutProgress";
import { IconEditor } from "./icons/iconEditor";
import { IconTracker } from "./icons/iconTracker";
import { ImagePreloader_preload } from "../utils/imagePreloader";
import { navigationRef } from "../navigation/navigationRef";
import { HostConfig_resolveUrl } from "../utils/hostConfig";

interface IProps {
  dispatch: IDispatch;
}

const onboardingImages = [
  "/images/dinounit.png",
  "/images/dinoequipment.png",
  "/images/dinoplates.png",
  "/images/dinoprogramselect.png",
];

export function ScreenFirst(props: IProps): JSX.Element {
  useNavOptions({ navHidden: true });

  useEffect(() => {
    for (const url of onboardingImages) {
      ImagePreloader_preload(url);
    }
  }, []);

  return (
    <View className="flex flex-col flex-1 bg-background-default">
      <View className="flex-1 px-4 pt-16 pb-4">
        <StorySlider
          slides={[
            <FirstSlide />,
            <RestSlide
              bgColorHexFrom={Tailwind_colors().purple[200]}
              bgColor="bg-purple-100"
              borderColor="border-purple-200"
              header={
                <View className="flex-row items-center justify-center">
                  <IconKettlebell color={Tailwind_colors().purple[600]} />
                  <Text className="ml-1 font-semibold text-text-purple">Weightlifting Programs</Text>
                </View>
              }
              bodyText="Start with a pre-built weightlifting program, or create your own."
              image="slide-2-image"
            />,
            <RestSlide
              bgColorHexFrom={Tailwind_colors().yellow[200]}
              bgColor="bg-yellow-100"
              borderColor="border-border-cardyellow"
              header={
                <View className="flex-row items-center justify-center">
                  <IconWorkoutProgress color={Tailwind_colors().yellow[600]} />
                  <Text className="ml-1 font-semibold text-icon-yellow">Workout Tracker</Text>
                </View>
              }
              bodyText="Log sets with one tap. Your reps and weight adjust automatically."
              image="slide-3-image"
            />,
            <RestSlide
              bgColorHexFrom={Tailwind_colors().purple[200]}
              bgColor="bg-purple-100"
              borderColor="border-purple-200"
              header={
                <View className="flex-row items-center justify-center">
                  <IconEditor color={Tailwind_colors().purple[600]} />
                  <Text className="ml-1 font-semibold text-text-purple">Program Editor</Text>
                </View>
              }
              bodyText="Modify or switch any program anytime to fit your goals."
              image="slide-4-image"
            />,
            <RestSlide
              bgColorHexFrom={Tailwind_colors().red[200]}
              bgColor="bg-red-100"
              borderColor="border-red-200"
              header={
                <View className="flex-row items-center justify-center">
                  <IconTracker color={Tailwind_colors().red[600]} />
                  <Text className="ml-1 font-semibold text-text-error">Workout History</Text>
                </View>
              }
              bodyText="Track your weekly stats to stay on target!"
              image="slide-5-image"
            />,
          ]}
          duration={5000}
        />
      </View>
      <View className="pb-6 mx-4">
        <Button
          className="w-full"
          name="see-how-it-works"
          kind="purple"
          onClick={() => props.dispatch(Thunk_pushScreen("units"))}
        >
          <View className="flex-row items-center justify-center">
            <Text className="text-xs font-semibold text-text-alwayswhite">Get started</Text>
            <AnimatedArrow />
          </View>
        </Button>
        <View className="mt-2">
          <Button
            className="w-full"
            name="see-how-it-works"
            kind="transparent-purple"
            onClick={() => navigationRef.navigate("accountModal")}
          >
            I have an account
          </Button>
        </View>
      </View>
    </View>
  );
}

function AnimatedArrow(): JSX.Element {
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 4,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [translateX]);

  return (
    <Animated.View style={{ marginLeft: 8, transform: [{ translateX }] }}>
      <IconArrowRight color="white" />
    </Animated.View>
  );
}

function FirstSlide(): JSX.Element {
  return (
    <View className="relative flex flex-col w-full h-full overflow-hidden bg-white rounded-2xl">
      <Image
        source={{ uri: HostConfig_resolveUrl("/images/slide-1-bg.jpg") }}
        className="absolute top-0 bottom-0 left-0 right-0 w-full h-full"
        resizeMode="cover"
      />
      <Text className="px-8 pt-24 text-3xl font-bold text-text-alwayswhite" style={{ lineHeight: 35 }}>
        The most powerful weightlifting{" "}
        <Text className="text-3xl" style={{ color: "#946AFF" }}>
          planner
        </Text>{" "}
        and{" "}
        <Text className="text-3xl" style={{ color: "#FF775D" }}>
          tracker
        </Text>{" "}
        app
      </Text>
      <Text className="px-8 py-6 text-base text-text-alwayswhite">
        Build any weightlifting program using a simple scripting language and track your progress.
      </Text>
      <View className="flex-1 w-full overflow-hidden">
        <SvgUri
          uri={HostConfig_resolveUrl("/images/logo.svg")}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMax meet"
        />
      </View>
    </View>
  );
}

interface IRestSlideProps {
  bgColorHexFrom: string;
  bgColor: string;
  borderColor: string;
  header: ReactNode;
  bodyText: string;
  image: string;
}

function RestSlide(props: IRestSlideProps): JSX.Element {
  return (
    <View
      className={`flex flex-col w-full h-full overflow-hidden border ${props.borderColor} rounded-2xl ${props.bgColor}`}
    >
      <View className="h-12 px-8" style={{ backgroundColor: props.bgColorHexFrom }} />
      <View className="px-8">{props.header}</View>
      <Text className="px-8 py-6 text-xl font-semibold text-center text-black">{props.bodyText}</Text>
      <View className="items-center justify-center flex-1 w-full">
        <Image
          source={{ uri: HostConfig_resolveUrl(`/images/${props.image}.png`) }}
          className="w-full h-full"
          resizeMode="contain"
        />
      </View>
    </View>
  );
}
