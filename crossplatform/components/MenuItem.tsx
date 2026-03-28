import React from "react";
import type { JSX } from "react";
import { View, Text, Pressable } from "react-native";
import { IconArrowRight } from "./icons/IconArrowRight";

interface IProps {
  name: string;
  value?: string;
  valueColor?: string;
  onPress?: () => void;
  showArrow?: boolean;
  prefix?: JSX.Element;
  expandName?: boolean;
}

export function MenuItem(props: IProps): JSX.Element {
  const { showArrow = true } = props;
  return (
    <Pressable
      className="flex-row justify-between items-center py-3 border-b border-border-neutral"
      onPress={props.onPress}
      disabled={!props.onPress}
    >
      <View className="flex-row items-center flex-1 min-w-0">
        {props.prefix}
        <Text className={`text-base text-text-primary ${props.expandName ? "" : "flex-shrink"}`}>{props.name}</Text>
      </View>
      <View className="flex-row items-center ml-2">
        {props.value != null && (
          <Text className="text-base" style={props.valueColor ? { color: props.valueColor } : undefined}>
            {props.value}
          </Text>
        )}
        {showArrow && props.onPress && (
          <View className="pl-2">
            <IconArrowRight color="#a0aec0" />
          </View>
        )}
      </View>
    </Pressable>
  );
}
