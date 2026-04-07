import { JSX, ReactNode } from "react";
import { ScrollView } from "react-native";

export function NavScreenContent(props: { children: ReactNode }): JSX.Element {
  return (
    <ScrollView data-cy="screen" testID="screen" contentContainerStyle={{ flexGrow: 1 }} style={{ flex: 1 }}>
      {props.children}
    </ScrollView>
  );
}
