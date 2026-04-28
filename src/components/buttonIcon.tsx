import { JSX, ReactNode } from "react";
import { GestureResponderEvent, Pressable } from "react-native";

interface IButtonIconProps {
  name: string;
  onClick?: (e: GestureResponderEvent) => void;
  onPress?: (e: GestureResponderEvent) => void;
  className?: string;
  children?: ReactNode;
  "data-cy"?: string;
}

export function ButtonIcon(props: IButtonIconProps): JSX.Element {
  return (
    <Pressable
      testID={props["data-cy"] ?? `nm-${props.name}`}
      data-cy={props["data-cy"]} data-testid={props["data-cy"]}
      className={`${props.className || ""} nm-${props.name} min-h-8 w-8 h-8 items-center justify-center bg-background-cardpurple border-border-cardpurple border rounded-lg`}
      onPress={props.onPress ?? props.onClick}
    >
      {props.children}
    </Pressable>
  );
}
