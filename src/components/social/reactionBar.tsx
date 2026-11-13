import { JSX, useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeOutDown,
  LinearTransition,
  ZoomIn,
  ZoomOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Text } from "../primitives/text";
import { IReaction, IReactionSummary, Reactions_all, Reactions_ordered } from "../../models/reactions";
import { ReactionImage } from "./reactionImage";
import { IconPlus2 } from "../icons/iconPlus2";
import { getNativeCardShadow } from "../historyRecord";

export type IReactionTone = "purple" | "yellow";

interface IReactionBarProps {
  summary?: IReactionSummary;
  canReact: boolean;
  onReact: (reaction: IReaction | undefined) => void;
  testIdPrefix: string;
  tone: IReactionTone;
}

const pillHeight = 32;
const pillEmojiSize = 20;
const pickerCellSize = 44;
const pickerStaggerMs = 15;
const popMs = 220;
const isNative = Platform.OS !== "web";
const popEasing = isNative ? Easing.out(Easing.back(2)) : undefined;

const pillEntering = isNative && popEasing ? ZoomIn.duration(popMs).easing(popEasing) : undefined;
const pillExiting = isNative ? ZoomOut.duration(140) : undefined;
const pillLayout = isNative ? LinearTransition.duration(200).easing(Easing.out(Easing.quad)) : undefined;
const countEntering = isNative ? FadeInDown.duration(160) : undefined;
const trayEntering = isNative ? FadeInDown.duration(180).easing(Easing.out(Easing.quad)) : undefined;
const trayExiting = isNative ? FadeOutDown.duration(120) : undefined;

function pickerCellEntering(index: number): ReturnType<typeof ZoomIn.duration> | undefined {
  return popEasing
    ? ZoomIn.delay(index * pickerStaggerMs)
        .duration(160)
        .easing(popEasing)
    : undefined;
}

function pillClassName(isMine: boolean, tone: IReactionTone): string {
  if (isMine) {
    return "flex-row items-center px-2 border rounded-full bg-color-red100 border-color-red300";
  }
  return tone === "yellow"
    ? "flex-row items-center px-2 border rounded-full bg-background-default border-border-cardyellow"
    : "flex-row items-center px-2 border rounded-full bg-background-default border-border-cardpurple";
}

function addButtonClassName(tone: IReactionTone): string {
  return tone === "yellow"
    ? "items-center justify-center border rounded-full bg-background-default border-border-cardyellow"
    : "items-center justify-center border rounded-full bg-background-default border-border-cardpurple";
}

export function ReactionPicker(props: {
  mine?: IReaction;
  onPick: (reaction: IReaction | undefined) => void;
  testIdPrefix: string;
}): JSX.Element {
  return (
    <ScrollView
      horizontal={true}
      showsHorizontalScrollIndicator={false}
      className="py-2 border rounded-2xl bg-background-default border-border-neutral"
      contentContainerStyle={{ paddingHorizontal: 8, gap: 4 }}
    >
      {Reactions_all.map((reaction, index) => {
        const isMine = props.mine === reaction;
        return (
          <Animated.View key={reaction} entering={pickerCellEntering(index)}>
            <Pressable
              testID={`${props.testIdPrefix}-pick-${reaction}`}
              data-testid={`${props.testIdPrefix}-pick-${reaction}`}
              className={`items-center justify-center rounded-full ${isMine ? "bg-color-red100" : ""}`}
              style={{ width: pickerCellSize, height: pickerCellSize }}
              onPress={() => props.onPick(isMine ? undefined : reaction)}
            >
              <ReactionImage reaction={reaction} size={isMine ? 34 : 30} />
            </Pressable>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}

function AddReactionButton(props: {
  isOpen: boolean;
  tone: IReactionTone;
  testId: string;
  onPress: () => void;
}): JSX.Element {
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.value = withTiming(props.isOpen ? 45 : 0, { duration: 200, easing: Easing.out(Easing.quad) });
  }, [props.isOpen]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  return (
    <Animated.View layout={pillLayout}>
      <Pressable
        testID={props.testId}
        data-testid={props.testId}
        onPress={props.onPress}
        className={addButtonClassName(props.tone)}
        style={{ width: pillHeight, height: pillHeight }}
      >
        <Animated.View style={iconStyle}>
          <IconPlus2 size={14} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export function ReactionBar(props: IReactionBarProps): JSX.Element | null {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const summary = props.summary;
  const pills = summary != null ? Reactions_ordered(summary) : [];
  if (pills.length === 0 && !props.canReact) {
    return null;
  }
  const pick = (reaction: IReaction | undefined): void => {
    setIsPickerOpen(false);
    props.onReact(reaction);
  };
  return (
    <View style={{ zIndex: 10 }}>
      {isPickerOpen && (
        <Animated.View
          entering={trayEntering}
          exiting={trayExiting}
          className="absolute left-0 right-0"
          style={[{ bottom: pillHeight + 8, zIndex: 10 }, getNativeCardShadow()]}
        >
          <ReactionPicker mine={summary?.mine} onPick={pick} testIdPrefix={props.testIdPrefix} />
        </Animated.View>
      )}
      <View className="flex-row flex-wrap items-center gap-2">
        {pills.map(({ reaction, count }) => {
          const isMine = summary?.mine === reaction;
          return (
            <Animated.View key={reaction} entering={pillEntering} exiting={pillExiting} layout={pillLayout}>
              <Pressable
                testID={`${props.testIdPrefix}-pill-${reaction}`}
                data-testid={`${props.testIdPrefix}-pill-${reaction}`}
                disabled={!props.canReact}
                onPress={() => pick(isMine ? undefined : reaction)}
                className={pillClassName(isMine, props.tone)}
                style={{ height: pillHeight }}
              >
                <Animated.View key={isMine ? "mine" : "other"} entering={pillEntering}>
                  <ReactionImage reaction={reaction} size={pillEmojiSize} />
                </Animated.View>
                <Animated.View key={count} entering={countEntering}>
                  <Text className={`ml-1 text-sm font-semibold ${isMine ? "text-text-error" : "text-text-primary"}`}>
                    {count}
                  </Text>
                </Animated.View>
              </Pressable>
            </Animated.View>
          );
        })}
        {props.canReact && (
          <AddReactionButton
            isOpen={isPickerOpen}
            tone={props.tone}
            testId={`${props.testIdPrefix}-add`}
            onPress={() => setIsPickerOpen(!isPickerOpen)}
          />
        )}
      </View>
    </View>
  );
}
