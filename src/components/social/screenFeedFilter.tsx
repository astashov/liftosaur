import { JSX, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "../primitives/text";
import { useNavOptions } from "../../navigation/useNavOptions";
import { IDispatch } from "../../ducks/types";
import { ISocialState } from "../../models/socialState";
import { Thunk_setFeedHiddenOwners } from "../../ducks/socialThunks";
import { Thunk_pullScreen } from "../../ducks/thunks";
import { Button } from "../button";
import { Avatar } from "./avatar";
import { IconCheckCircle } from "../icons/iconCheckCircle";

interface IProps {
  userId: string;
  nickname?: string;
  social?: ISocialState;
  dispatch: IDispatch;
}

export function ScreenFeedFilter(props: IProps): JSX.Element {
  useNavOptions({ navTitle: "Show in Feed" });
  const [hidden, setHidden] = useState<string[]>(props.social?.hiddenOwners ?? []);
  const people = [
    { userId: props.userId, nickname: props.nickname, label: "You" },
    ...(props.social?.follows?.following ?? []).map((f) => ({ ...f, label: f.nickname || f.userId })),
  ];
  const toggle = (userId: string): void => {
    setHidden(hidden.includes(userId) ? hidden.filter((id) => id !== userId) : [...hidden, userId]);
  };
  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between pt-4 pb-2 px-gutter">
        <Text className="flex-1 text-sm text-text-secondary">Choose whose workouts appear in your Home feed.</Text>
        <Pressable
          testID="feed-filter-deselect"
          data-testid="feed-filter-deselect"
          onPress={() => setHidden(people.map((p) => p.userId))}
        >
          <Text className="text-sm text-text-link">Deselect all</Text>
        </Pressable>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="px-gutter pb-4">
        {people.map((person) => {
          const isOn = !hidden.includes(person.userId);
          return (
            <Pressable
              key={person.userId}
              testID="feed-filter-person"
              data-testid="feed-filter-person"
              className="flex-row items-center gap-3 py-3 border-b border-border-neutral"
              onPress={() => toggle(person.userId)}
            >
              <Avatar seed={person.userId} nickname={person.nickname} size={40} dimmed={!isOn} />
              <Text className={`flex-1 text-base ${isOn ? "" : "text-text-secondary"}`}>{person.label}</Text>
              {isOn ? <IconCheckCircle isChecked={true} /> : <View style={{ width: 24, height: 24 }} />}
            </Pressable>
          );
        })}
      </ScrollView>
      <View className="pt-2 pb-6 px-gutter">
        <Button
          kind="purple"
          name="feed-filter-apply"
          data-testid="feed-filter-apply"
          testID="feed-filter-apply"
          className="w-full"
          onClick={() => {
            props.dispatch(Thunk_setFeedHiddenOwners(hidden));
            props.dispatch(Thunk_pullScreen());
          }}
        >
          Apply
        </Button>
      </View>
    </View>
  );
}
