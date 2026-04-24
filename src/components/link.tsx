import { JSX, ReactNode } from "react";
import { Linking } from "react-native";
import { Text } from "./primitives/text";

interface IProps {
  href?: string;
  className?: string;
  children?: ReactNode;
  "data-cy"?: string;
}

export function Link(props: IProps): JSX.Element {
  return (
    <Text
      data-cy={props["data-cy"]}
      className={`text-text-link font-bold underline ${props.className || ""}`}
      onPress={() => {
        if (props.href) {
          Linking.openURL(props.href);
        }
      }}
    >
      {props.children}
    </Text>
  );
}
