import { JSX, ReactNode } from "react";
import { Linking, Alert } from "react-native";
import { Text } from "./primitives/text";
import { ClipboardUtils_copy } from "../utils/clipboard";

interface IProps {
  href?: string;
  className?: string;
  children?: ReactNode;
  testID?: string;
}

export function Link(props: IProps): JSX.Element {
  return (
    <Text
      data-testid={props.testID}
      testID={props.testID}
      className={`text-text-link font-bold underline ${props.className || ""}`}
      onPress={() => {
        const href = props.href;
        if (!href) {
          return;
        }
        Linking.openURL(href).catch(() => {
          if (href.startsWith("mailto:")) {
            const email = href.replace(/^mailto:/, "").split("?")[0];
            ClipboardUtils_copy(email);
            Alert.alert("Email copied", `${email} was copied to your clipboard.`);
          }
        });
      }}
    >
      {props.children}
    </Text>
  );
}
