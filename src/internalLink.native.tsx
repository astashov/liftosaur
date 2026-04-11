import { JSX, ReactNode } from "react";
import { Pressable, Linking } from "react-native";
import { Text } from "./components/primitives/text";

interface IProps {
  href: string;
  className?: string;
  children: ReactNode;
  name: string;
}

export function InternalLink(props: IProps): JSX.Element {
  const url = props.href.startsWith("/") ? `https://www.liftosaur.com${props.href}` : props.href;
  return (
    <Pressable
      className="w-full py-3"
      onPress={() => {
        Linking.openURL(url).catch(() => undefined);
      }}
    >
      {typeof props.children === "string" ? <Text className={props.className}>{props.children}</Text> : props.children}
    </Pressable>
  );
}
