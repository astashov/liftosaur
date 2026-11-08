import { useEffect, useRef } from "react";
import { Keyboard } from "react-native";

export function useFreeformKeyboardExit(isFreeform: boolean, exit: () => void): void {
  const exitRef = useRef(exit);
  exitRef.current = exit;
  useEffect(() => {
    if (!isFreeform) {
      return undefined;
    }
    // Entering freeform flips the flag ~50ms before the caret summons the IME, and a stale hide
    // in that window (or the custom keypad closing) would bounce straight back out.
    let hasShown = false;
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      hasShown = true;
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      if (hasShown) {
        exitRef.current();
      }
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [isFreeform]);
}
