import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function App(): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text>Welcome to React Native with Web and React!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5fcff",
  },
});
