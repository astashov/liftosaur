import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, Text, StyleSheet } from "react-native";

function PlaceholderScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Liftosaur</Text>
      <Text style={styles.subtext}>React Native shell loaded</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
  },
  text: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#e94560",
  },
  subtext: {
    fontSize: 16,
    color: "#999",
    marginTop: 8,
  },
});

export function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <PlaceholderScreen />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
