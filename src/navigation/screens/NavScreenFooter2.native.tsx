import React from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { IconHome } from "../../components/icons/iconHome";
import { IconDoc2 } from "../../components/icons/iconDoc2";
import { IconBarbell2 } from "../../components/icons/iconBarbell2";
import { IconGraphs } from "../../components/icons/iconGraphs";
import { IconMe } from "../../components/icons/iconMe";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

const tabs: { key: string; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "program", label: "Program" },
  { key: "workout", label: "Workout" },
  { key: "graphs", label: "Graphs" },
  { key: "me", label: "Me" },
];

const shadowStyle = Platform.select({
  ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 4 },
  android: { elevation: 4 },
  default: {},
});

function TabIcon(props: { tab: string; isActive: boolean }): React.JSX.Element | null {
  const activeColor = Tailwind_semantic().icon.purple;
  const inactiveColor = Tailwind_semantic().icon.neutral;
  switch (props.tab) {
    case "home":
      return <IconHome size={20} isSelected={props.isActive} />;
    case "program":
      return <IconDoc2 isSelected={props.isActive} />;
    case "workout":
      return (
        <View
          className="items-center justify-center rounded-full bg-button-primarybackground border-background-default"
          style={[{ width: 53, height: 53, borderWidth: 3 }, shadowStyle]}
        >
          <IconBarbell2 isSelected={props.isActive} />
        </View>
      );
    case "graphs":
      return <IconGraphs color={props.isActive ? activeColor : inactiveColor} />;
    case "me":
      return <IconMe isSelected={props.isActive} />;
    default:
      return null;
  }
}

export function Footer2Wrapper(props: BottomTabBarProps): React.JSX.Element {
  const { state, navigation } = props;
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row items-end bg-background-default"
      style={[shadowStyle, { paddingBottom: insets.bottom, overflow: "visible" }]}
    >
      {tabs.map((tab, index) => {
        const isActive = state.index === index;
        const isWorkout = tab.key === "workout";
        return (
          <Pressable
            key={tab.key}
            className="items-center flex-1 pt-3"
            testID={`footer-${tab.key}`}
            onPress={() => {
              if (!isActive) {
                navigation.navigate(tab.key);
              }
            }}
          >
            <View className="items-center" style={isWorkout ? { marginTop: -20 } : undefined}>
              <TabIcon tab={tab.key} isActive={isActive} />
              <Text
                className={`text-[0.625rem] ${isWorkout ? "pt-0.5" : "pt-1"} ${isActive ? "text-icon-purple" : "text-icon-neutralsubtle"}`}
              >
                {tab.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
