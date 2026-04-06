import React from "react";
import { View, Text, Pressable } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const tabs: { key: string; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "program", label: "Program" },
  { key: "workout", label: "Workout" },
  { key: "graphs", label: "Graphs" },
  { key: "me", label: "Me" },
];

export function Footer2Wrapper(props: BottomTabBarProps): React.JSX.Element {
  const { state, navigation } = props;
  return (
    <View className="flex-row bg-background-default border-t border-background-neutral">
      {tabs.map((tab, index) => {
        const isActive = state.index === index;
        return (
          <Pressable
            key={tab.key}
            className="flex-1 items-center py-2"
            onPress={() => {
              if (!isActive) {
                navigation.navigate(tab.key);
              }
            }}
          >
            <Text className={isActive ? "text-xs font-bold text-icon-purple" : "text-xs text-icon-neutralsubtle"}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
