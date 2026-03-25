import "./global.css";
import "./src/screens/registerScreens";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { StoreProvider } from "./src/context/StoreContext";
import { NativeAppProvider } from "./src/context/NativeAppProvider";

export default function App(): React.ReactElement {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider>
          <NativeAppProvider>
            <AppNavigator />
          </NativeAppProvider>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
