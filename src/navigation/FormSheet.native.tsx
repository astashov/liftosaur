import { JSX, ReactNode } from "react";
import { View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface IProps {
  children: ReactNode;
}

export function FormSheet(props: IProps): JSX.Element {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === "android" ? insets.bottom : 0;
  if (bottomInset === 0) {
    return <>{props.children}</>;
  }
  return <View style={{ paddingBottom: bottomInset }}>{props.children}</View>;
}
