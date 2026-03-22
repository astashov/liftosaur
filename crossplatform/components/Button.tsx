import React from "react";
import { Pressable, Text } from "react-native";

interface IProps {
  buttonSize?: "xs" | "sm" | "md" | "lg" | "lg2";
  kind: "orange" | "purple" | "grayv2" | "red" | "transparent-purple" | "lightpurple" | "lightgrayv3";
  name: string;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  "data-cy"?: string;
}

export function Button(props: IProps): React.ReactElement {
  const { children, buttonSize, kind, disabled } = props;
  let className = "text-xs rounded-lg";
  let textClassName = "";
  if (disabled) {
    className += " bg-background-darkgray opacity-50";
    textClassName += " text-text-alwayswhite";
  } else if (kind === "purple") {
    className += " bg-button-primarybackground";
    textClassName += " text-text-alwayswhite";
  } else if (kind === "grayv2") {
    className += " bg-background-darkgray";
    textClassName += " text-text-alwayswhite";
  } else if (kind === "red") {
    className += " bg-background-darkred";
    textClassName += " text-text-alwayswhite";
  } else if (kind === "transparent-purple") {
    className += " bg-transparent";
    textClassName += " text-text-purple";
  } else if (kind === "lightpurple") {
    className += " bg-background-purpledark";
    textClassName += " text-text-link";
  } else if (kind === "lightgrayv3") {
    className += " bg-background-subtle border border-background-subtle";
    textClassName += " text-text-link";
  } else {
    className += " bg-button-orangebackground";
    textClassName += " text-text-primaryinverse";
  }
  if (buttonSize === "sm") {
    className += " px-2 py-1";
    textClassName += " font-semibold";
  } else if (buttonSize === "xs") {
    className += " px-1 py-0";
    textClassName += " font-normal";
  } else if (buttonSize === "md") {
    className += " px-4 py-2";
    textClassName += " font-semibold";
  } else if (buttonSize === "lg2") {
    className += " px-2 py-3";
    textClassName += " font-semibold";
  } else {
    className += " px-8 py-3";
    textClassName += " font-semibold";
  }
  if (props.className) {
    className += ` ${props.className}`;
  }
  return (
    <Pressable
      className={`${className} nm-${props.name} items-center`}
      onPress={disabled ? undefined : props.onPress}
      data-cy={props["data-cy"]}
    >
      <Text className={`text-xs ${textClassName}`}>{children}</Text>
    </Pressable>
  );
}
