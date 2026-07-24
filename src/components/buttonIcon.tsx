import { JSX, ReactNode } from "react";
import { GestureResponderEvent, Pressable } from "react-native";
import { useTrackClick } from "../utils/clickTracking";

interface IButtonIconProps {
  name: string;
  onClick?: (e: GestureResponderEvent) => void;
  onPress?: (e: GestureResponderEvent) => void;
  className?: string;
  children?: ReactNode;
  testID?: string;
}

export function ButtonIcon(props: IButtonIconProps): JSX.Element {
  const trackClick = useTrackClick();
  const userOnPress = props.onPress ?? props.onClick;
  const onPress = (e: GestureResponderEvent): void => {
    trackClick(props.name, props.className);
    userOnPress?.(e);
  };
  return (
    <Pressable
      testID={props.testID ?? `nm-${props.name}`}
      data-testid={props.testID}
      className={`${props.className || ""} nm-${props.name} min-h-8 w-8 h-8 items-center justify-center bg-background-cardpurple border-border-cardpurple border rounded-lg`}
      onPress={onPress}
    >
      {props.children}
    </Pressable>
  );
}
