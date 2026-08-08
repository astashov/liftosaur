import { useEffect, useRef, useState } from "react";
import { Keyboard, Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Returns how much of the IME the window did NOT absorb. iOS never resizes; Android
// adjustResize shrinks the window on old versions, but targetSdk 35+ edge-to-edge
// enforcement (Android 15+) ignores it — so subtract the actual window shrink instead of
// assuming either behavior.
export function useSystemKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  const { height: windowHeight } = useWindowDimensions();
  const noKeyboardWindowHeight = useRef(windowHeight);
  if (height === 0) {
    noKeyboardWindowHeight.current = windowHeight;
  }
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  return Math.max(0, height - Math.max(0, noKeyboardWindowHeight.current - windowHeight));
}

// The same height, but measured from the bottom of the screen rather than from the top of the
// navigation bar. Android's keyboard event reports `imeInsets.bottom - barInsets.bottom`
// (ReactRootView), so the bar it covers is missing from the number; iOS already reports the
// raw height. Use this — not the bare hook — whenever the keyboard is being compared against
// something that pads for the bottom inset itself, like the tab bar.
export function useSystemKeyboardHeightFromScreenBottom(): number {
  const height = useSystemKeyboardHeight();
  const insets = useSafeAreaInsets();
  return height > 0 && Platform.OS === "android" ? height + insets.bottom : height;
}
