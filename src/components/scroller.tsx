import React, { JSX } from "react";
import { useRef } from "react";
import { View, ScrollView } from "react-native";

interface IProps {
  children: React.ReactNode;
  arrowYOffsetPct?: number;
}

export function Scroller(props: IProps): JSX.Element {
  const tabsRef = useRef<ScrollView>(null);

  return (
    <View className="flex-1">
      <View className="">{props.children}</View>
    </View>
  );
}
