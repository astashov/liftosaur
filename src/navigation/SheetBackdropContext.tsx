import { JSX, ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Tailwind_isDark } from "../utils/tailwindConfig";
import type { IRootStackParamList } from "./types";

interface ISheetBackdropContextValue {
  count: number;
  present: () => void;
  dismiss: () => void;
}

const SheetBackdropContext = createContext<ISheetBackdropContextValue>({
  count: 0,
  present: () => undefined,
  dismiss: () => undefined,
});

export function SheetBackdropProvider(props: { children: ReactNode }): JSX.Element {
  const [count, setCount] = useState(0);
  const present = useCallback(() => setCount((prev) => prev + 1), []);
  const dismiss = useCallback(() => setCount((prev) => Math.max(0, prev - 1)), []);
  const value = useMemo(() => ({ count, present, dismiss }), [count, present, dismiss]);
  return <SheetBackdropContext.Provider value={value}>{props.children}</SheetBackdropContext.Provider>;
}

export function SheetBackdropPresence(): null {
  const { present, dismiss } = useContext(SheetBackdropContext);
  const navigation = useNavigation<NativeStackNavigationProp<IRootStackParamList>>();

  useEffect(() => {
    let isCounted = false;
    const setPresented = (next: boolean): void => {
      if (next === isCounted) {
        return;
      }
      isCounted = next;
      if (next) {
        present();
      } else {
        dismiss();
      }
    };
    setPresented(true);
    // Unmount happens only after the sheet has finished sliding away, which would leave the
    // backdrop fading over an already-empty screen. `transitionStart` fires when the dismissal
    // begins - and again with closing: false if a drag-to-dismiss gets cancelled.
    const unsubscribe = navigation.addListener("transitionStart", (e) => setPresented(!e.data.closing));
    return () => {
      unsubscribe();
      setPresented(false);
    };
  }, [present, dismiss, navigation]);
  return null;
}

// Dark mode can't rely on iOS dimming the presenting content - black on black reads as one
// surface. Lift it instead, so the sheet stays the darker of the two.
const LIFT_COLOR = "rgba(255,255,255,0.15)";

export function SheetBackdropLift(): JSX.Element | null {
  const { count } = useContext(SheetBackdropContext);
  const isPresented = count > 0;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // The lift sits under iOS's own dim, so it reads attenuated while the sheet is up. The dim
    // fades faster than the sheet slides, so a leisurely fade-out gets exposed mid-way and
    // flashes brighter - clear it quickly instead, while the dim still masks the change.
    Animated.timing(opacity, {
      toValue: isPresented ? 1 : 0,
      duration: isPresented ? 200 : 100,
      useNativeDriver: true,
    }).start();
  }, [isPresented, opacity]);

  if (!Tailwind_isDark()) {
    return null;
  }
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: LIFT_COLOR, opacity }]} />
  );
}
