import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tailwind_semantic, Tailwind_colors } from "@shared/utils/tailwindConfig";
import {
  IconHome,
  IconHomeSelected,
  IconDoc,
  IconDocSelected,
  IconBarbell,
  IconBarbellSelected,
  IconGraphs,
  IconMe,
  IconMeSelected,
} from "./icons/TabBarIcons";

function getTabIcon(tabName: string, isFocused: boolean): React.ReactElement {
  const sem = Tailwind_semantic();
  const color = isFocused ? sem.icon.purple : sem.icon.neutral;
  switch (tabName) {
    case "home":
      return isFocused ? <IconHomeSelected color={color} size={20} /> : <IconHome color={color} size={20} />;
    case "program":
      return isFocused ? <IconDocSelected color={color} size={24} /> : <IconDoc color={color} size={24} />;
    case "graphs":
      return <IconGraphs color={color} size={20} />;
    case "me":
      return isFocused ? <IconMeSelected color={color} size={24} /> : <IconMe color={color} size={24} />;
    default:
      return <IconHome color={color} size={20} />;
  }
}

const TAB_LABELS: Record<string, string> = {
  home: "Home",
  program: "Program",
  workout: "Workout",
  graphs: "Graphs",
  me: "Me",
};

export function TabBar({ state, navigation }: BottomTabBarProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const sem = Tailwind_semantic();
  const colors = Tailwind_colors();

  const onTabPress = (routeName: string, routeKey: string, isFocused: boolean) => {
    const event = navigation.emit({
      type: "tabPress",
      target: routeKey,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  const renderTab = (index: number) => {
    const route = state.routes[index];
    const isFocused = state.index === index;
    const label = TAB_LABELS[route.name] ?? route.name;
    const icon = getTabIcon(route.name, isFocused);

    return (
      <TouchableOpacity
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        onPress={() => onTabPress(route.name, route.key, isFocused)}
        style={styles.tab}
      >
        <View style={styles.iconContainer}>{icon}</View>
        <Text style={[styles.label, { color: sem.icon.neutral }, isFocused && { color: sem.text.purple }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const workoutIndex = state.routes.findIndex((r) => r.name === "workout");
  const workoutRoute = state.routes[workoutIndex];
  const isWorkoutFocused = state.index === workoutIndex;

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom,
          backgroundColor: sem.background.default,
          borderTopColor: sem.border.neutral,
        },
      ]}
    >
      <View style={styles.sideGroup}>
        {renderTab(0)}
        {renderTab(1)}
      </View>
      <View style={styles.centerGroup}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={isWorkoutFocused ? { selected: true } : {}}
          onPress={() => onTabPress(workoutRoute.name, workoutRoute.key, isWorkoutFocused)}
          style={styles.workoutTouchable}
        >
          <View
            style={[
              styles.workoutButton,
              { backgroundColor: sem.button.primarybackground, borderColor: sem.background.default },
            ]}
          >
            {isWorkoutFocused ? (
              <IconBarbellSelected color={colors.white} size={30} />
            ) : (
              <IconBarbell color={colors.white} size={30} />
            )}
          </View>
          <Text
            style={[
              styles.label,
              { color: sem.icon.neutral },
              isWorkoutFocused && { color: sem.text.purple },
            ]}
          >
            Workout
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.sideGroup}>
        {renderTab(3)}
        {renderTab(4)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 8,
  },
  sideGroup: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  centerGroup: {
    width: 75,
    alignItems: "center",
  },
  tab: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  iconContainer: {
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontSize: 10,
    marginTop: 4,
  },
  workoutTouchable: {
    alignItems: "center",
    marginTop: -27,
  },
  workoutButton: {
    width: 53,
    height: 53,
    borderRadius: 27,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
});
