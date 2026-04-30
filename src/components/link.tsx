import { JSX, ReactNode } from "react";
import { Linking } from "react-native";
import { Text } from "./primitives/text";
import {
  SendMessage_isIos,
  SendMessage_isAndroid,
  SendMessage_toIos,
  SendMessage_toAndroid,
} from "../utils/sendMessage";

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
        if (SendMessage_isIos()) {
          SendMessage_toIos({ type: "openUrl", url: href });
        } else if (SendMessage_isAndroid()) {
          SendMessage_toAndroid({ type: "openUrl", url: href });
        } else {
          Linking.openURL(href);
        }
      }}
    >
      {props.children}
    </Text>
  );
}
