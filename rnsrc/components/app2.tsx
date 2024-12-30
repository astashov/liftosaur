import React from "react";
import { View, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { IconDoc } from "../../src/components/icons/iconDoc";
import { IconCog2 } from "../../src/components/icons/iconCog2";
import { WebView } from "react-native-webview";

// Screens
const HomeScreen = (): JSX.Element => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "stretch" }}>
    <WebView
      source={{ uri: "https://local.liftosaur.com:8080/app/" }}
      injectedJavaScript={`
      window.appState = {};
    `}
      onMessage={(event) => {
        console.log("Message from WebView:", event.nativeEvent.data);
      }}
      style={{ flex: 1 }}
    />
  </View>
);

const SettingsScreen = (): JSX.Element => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
    <Text>Settings Screen</Text>
  </View>
);

// Create Bottom Tabs
const Tab = createBottomTabNavigator();

export default function App(): JSX.Element {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            if (route.name === "Home") {
              return <IconDoc width={size} height={size} />;
            } else if (route.name === "Settings") {
              return <IconCog2 size={size} />;
            }
          },
          tabBarActiveTintColor: "tomato",
          tabBarInactiveTintColor: "gray",
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
