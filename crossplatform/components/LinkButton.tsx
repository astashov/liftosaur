import type React from "react";
import type { JSX } from "react";
import { Pressable, Text } from "react-native";

interface IProps {
  name: string;
  className?: string;
  onPress?: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
  "data-cy"?: string;
}

export function LinkButton(props: IProps): JSX.Element {
  const className = props.className || "";
  const fontWeight = className.indexOf("font-normal") === -1 ? "font-bold" : "";
  const underline = className.indexOf("no-underline") === -1 ? "underline" : "";
  return (
    <Pressable onPress={props.disabled ? undefined : props.onPress} data-cy={props["data-cy"] || props.name}>
      <Text className={`text-text-link ${fontWeight} ${underline} ${className}`}>{props.children}</Text>
    </Pressable>
  );
}
