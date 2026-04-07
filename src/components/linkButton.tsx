import { JSX, ReactNode } from "react";
import { Pressable } from "react-native";
import { Text } from "./primitives/text";

interface IProps {
  name: string;
  onPress?: () => void;
  onClick?: (...args: any[]) => void;
  className?: string;
  children?: ReactNode;
  testID?: string;
  "data-cy"?: string;
  disabled?: boolean;
}

export function LinkButton(props: IProps): JSX.Element {
  const { className, children } = props;
  const testID = props.testID || props["data-cy"] || props.name;
  const isFontNormal = className?.includes("font-normal");
  const isNoUnderline = className?.includes("no-underline");
  let textCn = `text-text-link ${!isFontNormal ? "font-bold" : ""} ${!isNoUnderline ? "underline" : ""} ${className || ""}`;
  return (
    <Pressable onPress={props.onPress || props.onClick} testID={testID} data-cy={testID} disabled={props.disabled}>
      {typeof children === "string" ? (
        <Text className={textCn}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
