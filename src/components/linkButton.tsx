import { JSX, ReactNode } from "react";
import { GestureResponderEvent, Pressable } from "react-native";
import { Text } from "./primitives/text";

interface IProps {
  name: string;
  onPress?: (e: GestureResponderEvent) => void;
  onClick?: (e: GestureResponderEvent) => void;
  className?: string;
  children?: ReactNode;
  testID?: string;
  disabled?: boolean;
}

function containsString(children: ReactNode): boolean {
  if (typeof children === "string" || typeof children === "number") {
    return true;
  }
  if (Array.isArray(children)) {
    return children.some((c) => typeof c === "string" || typeof c === "number");
  }
  return false;
}

export function LinkButton(props: IProps): JSX.Element {
  const { className, children } = props;
  const testID = props.testID || props.name;
  const isFontNormal = className?.includes("font-normal");
  const isNoUnderline = className?.includes("no-underline");
  const textCn = `text-text-link ${!isFontNormal ? "font-bold" : ""} ${!isNoUnderline ? "underline" : ""} ${className || ""}`;
  const accessibilityLabel = typeof children === "string" ? children : undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={props.onPress || props.onClick}
      testID={testID}
      data-testid={testID}
      disabled={props.disabled}
    >
      {containsString(children) ? <Text className={textCn}>{children}</Text> : children}
    </Pressable>
  );
}
