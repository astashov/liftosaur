import type { JSX } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";

interface IProps {
  title: string;
  name: string;
  icon?: JSX.Element;
  isFirst?: boolean;
  description?: string | JSX.Element;
  className?: string;
  onClick: () => void;
}

export function BottomSheetItem(props: IProps): JSX.Element {
  return (
    <Pressable
      data-cy={`bottom-sheet-${props.name}`} data-testid={`bottom-sheet-${props.name}`}
      testID={`bottom-sheet-${props.name}`}
      className={`${!props.isFirst ? "mt-4 border-t border-border-neutral" : ""} ${props.className ?? ""}`}
      onPress={props.onClick}
    >
      <View className={`flex-row items-center ${!props.isFirst ? "pt-4" : ""}`}>
        {props.icon && <View>{props.icon}</View>}
        <Text className="flex-1 pl-3 text-base">{props.title}</Text>
      </View>
      {props.description ? (
        typeof props.description === "string" ? (
          <Text className="pt-2 text-xs text-text-secondary">{props.description}</Text>
        ) : (
          <View className="pt-2">{props.description}</View>
        )
      ) : null}
    </Pressable>
  );
}
