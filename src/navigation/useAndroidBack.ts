import { useContext, useEffect, useRef } from "react";
import { BackHandler, Platform } from "react-native";
import { NavigationRouteContext } from "@react-navigation/native";
import { navigationRef } from "./navigationRef";

// Android runs the newest back listener first, so an inner panel registered while its screen is
// under a modal would take Back from that modal. The route check hands Back on in that case.
export function useAndroidBack(isActive: boolean, onBack: () => void): void {
  const routeKey = useContext(NavigationRouteContext)?.key;
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (Platform.OS !== "android" || !isActive) {
      return undefined;
    }
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (routeKey != null && navigationRef.isReady() && navigationRef.getCurrentRoute()?.key !== routeKey) {
        return false;
      }
      onBackRef.current();
      return true;
    });
    return () => subscription.remove();
  }, [isActive, routeKey]);
}
