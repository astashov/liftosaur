import { IScreen, ITab, Screen } from "../models/screen";
import { StringUtils } from "../utils/string";
import { View, TouchableOpacity } from "react-native";
import { LftText } from "./lftText";

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
    <TouchableOpacity
      className={`px-2 flex items-center text-center nm-${dataCy}`}
      data-cy={dataCy}
      onPress={props.onClick}
    >
      {props.icon(isActive)}
      <View className={`pt-1 ${isActive ? "text-purplev2-main" : ""}`}>
        <LftText style={{ fontSize: 10 }} className="text-center">
          {props.text}
        </LftText>
      </View>
    </TouchableOpacity>
  );
}
