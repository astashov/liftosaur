import type { JSX } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { ITab } from "../models/screen";
import { StringUtils_dashcase } from "../utils/string";

export interface IProps {
  name: ITab;
  icon: (isActive: boolean) => JSX.Element;
  currentTab: ITab;
  hasDot?: boolean;
  text: string;
  onClick?: () => void;
  isActive?: boolean;
}

export function FooterButton(props: IProps): JSX.Element {
  const isActive = props.name === props.currentTab;
  const dataCy = `footer-${StringUtils_dashcase(props.text)}`;
  return (
    <Pressable
      className="relative items-center px-2"
      data-testid={dataCy}
      testID={dataCy}
      onPress={isActive ? undefined : props.onClick}
    >
      {props.hasDot && <View className="absolute w-2 h-2 rounded-full top-3 right-3 bg-redv2-700" />}
      <View className="flex-row items-center justify-center w-6 h-6">{props.icon(isActive)}</View>
      <Text className={`pt-1 text-[0.625rem] ${isActive ? "text-text-purple" : "text-text-secondary"}`}>
        {props.text}
      </Text>
    </Pressable>
  );
}
