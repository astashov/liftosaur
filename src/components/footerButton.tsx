import React, { JSX } from "react";
import { IScreen, ITab, Screen } from "../models/screen";
import { StringUtils } from "../utils/string";
import { View, Text, TouchableOpacity } from "react-native";

export interface IProps {
  name: ITab;
  icon: (isActive: boolean) => JSX.Element;
  screen: IScreen;
  text: string;
  onClick?: () => void;
  isActive?: boolean;
}

export function FooterButton(props: IProps): JSX.Element {
  const isActive = Screen.tab(props.screen) === props.name;
  const dataCy = `footer-${StringUtils.dashcase(props.text)}`;
  return (
    <TouchableOpacity className={`inline-block px-2 text-center nm-${dataCy}`} data-cy={dataCy} onPress={props.onClick}>
      {props.icon(isActive)}
      <View className={`pt-1 ${isActive ? "text-purplev2-main" : ""}`}>
        <Text style={{ fontSize: 10 }}>{props.text}</Text>
      </View>
    </TouchableOpacity>
  );
}
