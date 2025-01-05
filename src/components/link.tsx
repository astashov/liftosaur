import { Linking } from "react-native";
import { LftText } from "./lftText";

type IProps = {
  className?: string;
  href: string;
  children: JSX.Element | string;
};

export function Link(props: IProps): JSX.Element {
  const { className, children } = props;
  return (
    <LftText
      onPress={() => {
        Linking.openURL(props.href);
      }}
      className={`text-bluev2 font-bold underline ${className}`}
    >
      {children}
    </LftText>
  );
}
