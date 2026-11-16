import { JSX, useCallback } from "react";
import { View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { FriendLoadError } from "./friendLoadError";
import { Text } from "../primitives/text";
import { useNavOptions } from "../../navigation/useNavOptions";
import { IDispatch } from "../../ducks/types";
import { ISocialState } from "../../models/socialState";
import { Thunk_loadFriendPrograms } from "../../ducks/socialThunks";
import { Thunk_pushScreen } from "../../ducks/thunks";
import { MenuItem } from "../menuItem";
import { IconSpinner } from "../icons/iconSpinner";
import { Follow_displayName } from "../../models/follow";

interface IProps {
  userId: string;
  social?: ISocialState;
  dispatch: IDispatch;
}

export function ScreenFriendPrograms(props: IProps): JSX.Element {
  const person = props.social?.follows?.following.find((f) => f.userId === props.userId);
  useNavOptions({ navTitle: "Programs", navSubtitle: Follow_displayName(person?.nickname) });
  const programs = props.social?.friendPrograms[props.userId];
  const error = props.social?.friendErrors[props.userId];
  const load = useCallback(() => {
    props.dispatch(Thunk_loadFriendPrograms(props.userId));
  }, [props.userId]);
  useFocusEffect(load);

  if (programs == null && error != null) {
    return <FriendLoadError message={error} onRetry={load} />;
  }
  if (programs == null) {
    return (
      <View className="items-center py-8">
        <IconSpinner width={24} height={24} />
      </View>
    );
  }
  if (programs.length === 0) {
    return <Text className="py-8 text-center text-text-secondary">No programs yet.</Text>;
  }
  return (
    <View className="px-4">
      {programs.map((program) => (
        <MenuItem
          key={program.id}
          name={program.name}
          value={program.isCurrent ? "Current" : undefined}
          shouldShowRightArrow={true}
          onClick={() =>
            props.dispatch(Thunk_pushScreen("friendProgram", { userId: props.userId, programId: program.id }))
          }
        />
      ))}
    </View>
  );
}
