import { JSX } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { Button } from "../button";

interface IProps {
  message: string;
  onRetry: () => void;
}

export function FriendLoadError(props: IProps): JSX.Element {
  return (
    <View className="items-center px-4 py-8">
      <Text className="mb-4 text-center text-text-secondary">{props.message}</Text>
      <Button
        kind="purple"
        buttonSize="md"
        name="friend-load-retry"
        data-testid="friend-load-retry"
        testID="friend-load-retry"
        onClick={props.onRetry}
      >
        Retry
      </Button>
    </View>
  );
}
