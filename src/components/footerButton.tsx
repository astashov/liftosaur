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
      className="items-center flex-1 px-0.5"
      data-testid={dataCy}
      testID={dataCy}
      onPress={isActive ? undefined : props.onClick}
    >
      <View className="relative flex-row items-center justify-center w-scaled-6 h-scaled-6">
        {props.icon(isActive)}
        {props.hasDot && <View className="absolute w-2 h-2 rounded-full bg-redv2-700" style={{ top: -1, right: -1 }} />}
      </View>
      <Text numberOfLines={1} className={`pt-1 text-2xs ${isActive ? "text-text-purple" : "text-text-secondary"}`}>
        {props.text}
      </Text>
    </Pressable>
  );
}
