import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { PlaceholderScreen } from "../screens/PlaceholderScreen";
import { tabScreens, type ITab } from "./screenMap";

const Tab = createBottomTabNavigator();

function createTabStack(tab: ITab): () => React.ReactElement {
  const Stack = createNativeStackNavigator();
  const screens = tabScreens[tab];

  return function TabStack(): React.ReactElement {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {screens.map((screen) => (
          <Stack.Screen key={screen} name={screen} component={PlaceholderScreen} />
        ))}
      </Stack.Navigator>
    );
  };
}

const HomeStack = createTabStack("home");
const ProgramStack = createTabStack("program");
const WorkoutStack = createTabStack("workout");
const GraphsStack = createTabStack("graphs");
const MeStack = createTabStack("me");

const tabConfig: Array<{
  name: ITab;
  component: () => React.ReactElement;
  label: string;
}> = [
  { name: "home", component: HomeStack, label: "Home" },
  { name: "program", component: ProgramStack, label: "Program" },
  { name: "workout", component: WorkoutStack, label: "Workout" },
  { name: "graphs", component: GraphsStack, label: "Graphs" },
  { name: "me", component: MeStack, label: "Me" },
];

export function AppNavigator(): React.ReactElement {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#6366f1",
          tabBarInactiveTintColor: "#9ca3af",
        }}
      >
        {tabConfig.map(({ name, component, label }) => (
          <Tab.Screen key={name} name={name} component={component} options={{ title: label }} />
        ))}
      </Tab.Navigator>
    </NavigationContainer>
  );
}
