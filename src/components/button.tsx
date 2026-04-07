import { JSX, ReactNode } from "react";
import { Pressable } from "react-native";
import { Text } from "./primitives/text";

interface IProps {
  buttonSize?: "xs" | "sm" | "md" | "lg" | "lg2";
  kind: "orange" | "purple" | "grayv2" | "red" | "transparent-purple" | "lightpurple" | "lightgrayv3";
  name: string;
  onPress?: () => void;
  onClick?: (...args: any[]) => void;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  testID?: string;
  "data-cy"?: string;
  type?: string;
  title?: string;
  style?: Record<string, unknown>;
  tabIndex?: number;
}

export function Button(props: IProps): JSX.Element {
  const { children, buttonSize, kind, disabled } = props;
  const testID = props.testID || props["data-cy"] || props.name;

  const hasTextSize =
    props.className &&
    (props.className.includes("text-xs") ||
      props.className.includes("text-sm") ||
      props.className.includes("text-lg") ||
      props.className.includes("text-base"));

  let containerCn = "rounded-lg items-center justify-center";
  let textCn = "";
  if (!hasTextSize) {
    textCn += "text-xs ";
  }

  if (disabled) {
    containerCn += " bg-background-darkgray opacity-50";
    textCn += " text-text-alwayswhite";
  } else if (kind === "purple") {
    containerCn += " bg-button-primarybackground";
    textCn += " text-text-alwayswhite";
  } else if (kind === "grayv2") {
    containerCn += " bg-background-darkgray";
    textCn += " text-text-alwayswhite";
  } else if (kind === "red") {
    containerCn += " bg-background-darkred";
    textCn += " text-text-alwayswhite";
  } else if (kind === "transparent-purple") {
    containerCn += " bg-transparent";
    textCn += " text-text-purple";
  } else if (kind === "lightpurple") {
    containerCn += " bg-background-purpledark";
    textCn += " text-text-link";
  } else if (kind === "lightgrayv3") {
    containerCn += " bg-background-subtle border border-background-subtle";
    textCn += " text-text-link";
  } else {
    containerCn += " bg-button-orangebackground";
    textCn += " text-text-primaryinverse";
  }

  if (buttonSize === "sm") {
    containerCn += " px-2 py-1";
    textCn += " font-semibold";
  } else if (buttonSize === "xs") {
    containerCn += " px-1 py-0";
    textCn += " font-normal";
  } else if (buttonSize === "md") {
    containerCn += " px-4 py-2";
    textCn += " font-semibold";
  } else if (buttonSize === "lg2") {
    containerCn += " px-2 py-3";
    textCn += " font-semibold";
  } else {
    containerCn += " px-8 py-3";
    textCn += " font-semibold";
  }

  if (props.className) {
    containerCn += ` ${props.className}`;
  }

  return (
    <Pressable
      className={containerCn}
      onPress={props.onPress || props.onClick}
      disabled={disabled}
      testID={testID}
      data-cy={testID}
    >
      {typeof children === "string" ? (
        <Text className={textCn}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
