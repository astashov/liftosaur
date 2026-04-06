import React, { type Ref } from "react";
import { ScrollView } from "react-native";

export function NavScreenContent(props: {
  children: React.ReactNode;
  scrollRef?: Ref<ScrollView>;
}): React.JSX.Element {
  return (
    <ScrollView ref={props.scrollRef} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
      {props.children}
    </ScrollView>
  );
}
