import { JSX, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "../primitives/text";
import { IReaction, IReactionSummary, Reactions_all, Reactions_ordered } from "../../models/reactions";
import { ReactionImage } from "./reactionImage";
import { IconPlus2 } from "../icons/iconPlus2";

interface IReactionBarProps {
  summary?: IReactionSummary;
  canReact: boolean;
  onReact: (reaction: IReaction | undefined) => void;
  testIdPrefix: string;
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
      {Reactions_all.map((reaction) => {
        const isMine = props.mine === reaction;
        return (
          <Pressable
            key={reaction}
            testID={`${props.testIdPrefix}-pick-${reaction}`}
            data-testid={`${props.testIdPrefix}-pick-${reaction}`}
            className={`items-center justify-center rounded-full ${isMine ? "bg-background-cardpurpleselected" : ""}`}
            style={{ width: 44, height: 44 }}
            onPress={() => props.onPick(isMine ? undefined : reaction)}
          >
            <ReactionImage reaction={reaction} size={isMine ? 34 : 30} />
          </Pressable>
        );
      })}
    </ScrollView>
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
    <View>
      {isPickerOpen && (
        <View className="mb-2">
          <ReactionPicker mine={summary?.mine} onPick={pick} testIdPrefix={props.testIdPrefix} />
        </View>
      )}
      <View className="flex-row flex-wrap items-center gap-2">
        {pills.map(({ reaction, count }) => {
          const isMine = summary?.mine === reaction;
          return (
            <Pressable
              key={reaction}
              testID={`${props.testIdPrefix}-pill-${reaction}`}
              data-testid={`${props.testIdPrefix}-pill-${reaction}`}
              disabled={!props.canReact}
              onPress={() => pick(isMine ? undefined : reaction)}
              className={`flex-row items-center px-2 py-1 border rounded-full ${
                isMine
                  ? "bg-background-cardpurpleselected border-border-purple"
                  : "bg-background-default border-border-neutral"
              }`}
            >
              <ReactionImage reaction={reaction} size={20} />
              <Text className={`ml-1 text-sm font-semibold ${isMine ? "text-text-purple" : "text-text-primary"}`}>
                {count}
              </Text>
            </Pressable>
          );
        })}
        {props.canReact && (
          <Pressable
            testID={`${props.testIdPrefix}-add`}
            data-testid={`${props.testIdPrefix}-add`}
            onPress={() => setIsPickerOpen(!isPickerOpen)}
            className="flex-row items-center px-2 py-1 border rounded-full border-border-neutral bg-background-default"
          >
            {pills.length === 0 ? (
              <Text className="text-sm text-text-secondary">Be the first to react</Text>
            ) : (
              <IconPlus2 size={14} />
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}
