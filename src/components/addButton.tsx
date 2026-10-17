import { JSX } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { useTrackClick } from "../utils/clickTracking";
import { IconPlus2 } from "./icons/iconPlus2";
import { Tailwind_semantic } from "../utils/tailwindConfig";

interface IProps {
  name: string;
  label: string;
  onClick: () => void;
}

export function AddButton(props: IProps): JSX.Element {
  const trackClick = useTrackClick();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      className="flex-row items-center py-3"
      testID={props.name}
      data-testid={props.name}
      onPress={() => {
        trackClick(props.name);
        props.onClick();
      }}
    >
      <View className="items-center justify-center w-6 h-6 mr-3 rounded-full bg-background-cardpurple">
        <IconPlus2 size={10} color={Tailwind_semantic().icon.purple} />
      </View>
      <Text className="flex-1 text-sm font-semibold text-text-purple">{props.label}</Text>
    </Pressable>
  );
}
