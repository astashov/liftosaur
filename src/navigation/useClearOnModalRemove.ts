import { useEffect, useRef } from "react";
import { useNavigation } from "@react-navigation/native";

// Flag-driven modals are opened by a screen effect that watches a redux flag and
// navigates on a false->true edge. If the flag is only cleared inside the modal's
// own close handler, an Android hardware/gesture back (which pops the native-stack
// screen without invoking that handler) leaves the flag set, and the edge-guarded
// watcher can never reopen the modal. Clearing on `beforeRemove` covers every
// dismissal path, so the flag always returns to falsy.
export function useClearOnModalRemove(clear: () => void): void {
  const navigation = useNavigation();
  const clearRef = useRef(clear);
  clearRef.current = clear;

  useEffect(() => {
    return navigation.addListener("beforeRemove", () => clearRef.current());
  }, [navigation]);
}
