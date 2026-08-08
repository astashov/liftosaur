import { JSX, useContext, useMemo } from "react";
import { Animated, Pressable, View } from "react-native";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { Text } from "./primitives/text";
import { useCustomKeyboardAnimatedHeight } from "../navigation/CustomKeyboardContext";
import { LiftoEditorHints_forContext } from "./primitives/liftoEditorHints";
import {
  LiftoEditorCrumbs,
  LiftoEditorHintBar,
  LiftoEditorPillRail,
  useLiftoEditorHintDismissed,
} from "./liftoEditorChrome";
import { useLiftoEditorBlurFocused, useLiftoEditorFocusEntry } from "./liftoEditorFocus";
import { IconCloseCircleOutline } from "./icons/iconCloseCircleOutline";
import { IconHelp } from "./icons/iconHelp";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { useRem } from "../utils/useRem";

// The screen-level chrome for whichever inline editor holds focus. Sits in
// NavScreenContent's footer slot (absolute, bottom-anchored, and the scroll content is
// padded by its height), lifted above the custom keypad — which the root
// CustomKeyboardProvider draws as its own bottom overlay.
export function LiftoEditorDock(): JSX.Element | null {
  const entry = useLiftoEditorFocusEntry();
  const [hintDismissed, setHintDismissed] = useLiftoEditorHintDismissed();
  const blurFocused = useLiftoEditorBlurFocused();
  const keypadHeight = useCustomKeyboardAnimatedHeight();
  // This dock bottoms out at the tab bar (NavScreenContent's footer lives inside the screen),
  // but the keypad is a root-level overlay that covers the tab bar too — so only the part of
  // it standing above the tab bar actually overlaps us. Clamped at 0 so a keypad shorter than
  // the tab bar doesn't push the dock down into it.
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const keypadLift = useMemo(
    () =>
      Animated.subtract(keypadHeight, tabBarHeight).interpolate({
        inputRange: [0, 1],
        outputRange: [0, -1],
        extrapolateLeft: "clamp",
        extrapolateRight: "extend",
      }),
    [keypadHeight, tabBarHeight]
  );
  const iconScale = useRem() / 16;

  if (entry == null) {
    return null;
  }
  const isFreeform = entry.controller.mode === "freeform";
  const hint = LiftoEditorHints_forContext(
    entry.controller.context,
    entry.controller.activeLevelIndex,
    entry.controller.text
  );

  return (
    <Animated.View
      className="border-t bg-background-default border-border-neutral"
      style={{ transform: [{ translateY: keypadLift }] }}
    >
      {/* No right padding and no gap: the close button is a w-10 centered column flush to the
          edge, which is what aligns it with the hint bar's dismiss and the pill rail's trash.
          A gap here would push the help icon visibly away from it. */}
      <View className="flex-row items-center py-0 pl-4">
        <View className="flex-1">
          {isFreeform ? (
            <Text className="text-sm text-text-secondary">Editing as text</Text>
          ) : (
            <LiftoEditorCrumbs controller={entry.controller} />
          )}
        </View>
        {!isFreeform && hint != null && hintDismissed ? (
          <Pressable testID="editor-dock-show-hint" className="py-2 pl-2 pr-1" onPress={() => setHintDismissed(false)}>
            <IconHelp size={20 * iconScale} color={Tailwind_semantic().icon.neutral} />
          </Pressable>
        ) : null}
        <Pressable
          testID="editor-dock-close"
          className="items-center w-10 py-2"
          // Left slop stays small so it doesn't swallow taps meant for the help icon.
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 4 }}
          onPress={isFreeform ? entry.controller.switchToStructured : blurFocused}
        >
          {isFreeform ? (
            <Text className="text-xs font-bold text-text-purple">Apply</Text>
          ) : (
            <IconCloseCircleOutline size={20 * iconScale} />
          )}
        </Pressable>
      </View>
      {!isFreeform && hint != null && !hintDismissed ? (
        <LiftoEditorHintBar hint={hint} onDismiss={() => setHintDismissed(true)} />
      ) : null}
      {!isFreeform && (entry.controller.context?.levels ?? []).length > 0 ? (
        <LiftoEditorPillRail controller={entry.controller} className="pb-4" />
      ) : null}
    </Animated.View>
  );
}
