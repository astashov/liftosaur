import React, { useRef } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNumpadContext } from "./NumpadContext";
import { IconNumpadClose } from "./icons/IconNumpadClose";
import { IconBackspace } from "./icons/IconBackspace";
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";

export const NUMPAD_HEIGHT = 280;

export function Numpad(): React.ReactElement {
  const { activeField, dismiss } = useNumpadContext();
  const insets = useSafeAreaInsets();
  const sem = Tailwind_semantic();
  const isTypingRef = useRef(false);
  const valueRef = useRef(activeField?.value ?? "");

  // Keep last field config so the numpad still renders during the slide-out animation
  const lastFieldRef = useRef(activeField);
  if (activeField != null) {
    lastFieldRef.current = activeField;
  }
  const field = activeField ?? lastFieldRef.current;

  if (field == null) {
    return <View />;
  }

  const { mode, step, min, max } = field;
  const allowDot = mode === "decimal";
  const maxLength = (max?.toString().length ?? 5) + (allowDot ? 3 : 0);

  const syncValue = (newValue: string): void => {
    valueRef.current = newValue;
    field.onChangeText(newValue);
  };

  const handleInput = (key: string): void => {
    let newValue = valueRef.current;
    if (!isTypingRef.current) {
      newValue = "";
    }
    if (key === "⌫") {
      newValue = newValue.slice(0, -1);
    } else if (key === ".") {
      if (allowDot && !newValue.includes(".")) {
        newValue += key;
      }
    } else if (newValue.length < maxLength) {
      newValue += key;
    }
    isTypingRef.current = true;
    syncValue(newValue);
  };

  const handlePlus = (): void => {
    const current = parseFloat(valueRef.current) || 0;
    let next: number;
    if (field.onIncrement) {
      next = field.onIncrement(current);
    } else {
      next = current + (step ?? 1);
    }
    if (max != null && next > max) next = max;
    if (min != null && next < min) next = min;
    isTypingRef.current = true;
    syncValue(mode === "integer" ? String(Math.round(next)) : String(next));
  };

  const handleMinus = (): void => {
    const current = parseFloat(valueRef.current) || 0;
    let next: number;
    if (field.onDecrement) {
      next = field.onDecrement(current);
    } else {
      next = current - (step ?? 1);
    }
    if (min != null && next < min) next = min;
    if (max != null && next > max) next = max;
    isTypingRef.current = true;
    syncValue(mode === "integer" ? String(Math.round(next)) : String(next));
  };

  const handleClose = (): void => {
    isTypingRef.current = false;
    dismiss();
  };

  // Reset typing state when field changes
  if (valueRef.current !== field.value && !isTypingRef.current) {
    valueRef.current = field.value;
  }

  const hasAddon = field.renderAddon != null || field.enableRmCalculator;

  const numberKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const bottomRow: (string | null)[] = [null, "0", allowDot ? "." : null];

  return (
    <View style={{ backgroundColor: sem.background.default, paddingBottom: insets.bottom }}>
      <View style={{ height: 1, backgroundColor: sem.border.neutral }} />

      {hasAddon && (
        <View className="flex-row items-center gap-2 px-4 pt-3 pb-1">
          <View className="flex-1">{field.renderAddon?.()}</View>
          {field.enableRmCalculator && (
            <Pressable
              className="items-center justify-center px-3 py-2 border rounded border-border-cardpurple bg-background-cardpurple"
              style={{ width: 96 }}
              onPress={() => {
                handleClose();
                field.onOpenRmCalculator?.();
              }}
              accessibilityLabel="RM Calculator"
              accessibilityRole="button"
            >
              <Text className="text-sm font-semibold text-text-primary">RM</Text>
            </Pressable>
          )}
        </View>
      )}

      <View className="flex-row gap-4 p-4">
        {/* Number grid */}
        <View className="flex-1">
          <View className="flex-row flex-wrap">
            {numberKeys.map((key) => (
              <NumpadKey key={key} label={key} onPress={() => handleInput(key)} />
            ))}
            {bottomRow.map((key, i) =>
              key != null ? (
                <NumpadKey key={key} label={key} onPress={() => handleInput(key)} />
              ) : (
                <View key={`empty-${i}`} style={{ width: "33.33%", aspectRatio: 1.6 }} />
              )
            )}
          </View>
        </View>

        {/* Right panel */}
        <View style={{ width: 96 }} className="justify-between mt-1">
          {/* Close button */}
          <Pressable
            className="items-center justify-center py-2 border rounded border-border-cardpurple bg-background-cardpurple"
            onPress={handleClose}
            accessibilityLabel="Close keyboard"
            accessibilityRole="button"
          >
            <IconNumpadClose />
          </Pressable>

          {/* Plus / Minus */}
          <View className="flex-row gap-1">
            <Pressable
              className="items-center justify-center flex-1 py-2 border rounded-l border-border-neutral bg-background-default"
              onPress={handleMinus}
              accessibilityLabel="Decrease value"
              accessibilityRole="button"
            >
              <Text className="text-lg font-semibold text-text-primary">−</Text>
            </Pressable>
            <Pressable
              className="items-center justify-center flex-1 py-2 border rounded-r border-border-neutral bg-background-default"
              onPress={handlePlus}
              accessibilityLabel="Increase value"
              accessibilityRole="button"
            >
              <Text className="text-lg font-semibold text-text-primary">+</Text>
            </Pressable>
          </View>

          {/* Unit selector placeholder — driven by addon in InputWeight */}
          <View style={{ height: 40 }} />

          {/* Backspace */}
          <Pressable
            className="items-center justify-center py-2 border rounded border-border-neutral bg-background-default"
            onPress={() => handleInput("⌫")}
            accessibilityLabel="Backspace"
            accessibilityRole="button"
          >
            <IconBackspace />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function NumpadKey(props: { label: string; onPress: () => void }): React.ReactElement {
  return (
    <Pressable
      style={{ width: "33.33%", aspectRatio: 1.6 }}
      className="items-center justify-center"
      onPress={props.onPress}
      accessibilityLabel={props.label}
      accessibilityRole="button"
    >
      {({ pressed }) => (
        <View
          className={`items-center justify-center w-full h-full rounded ${pressed ? "bg-background-neutral" : ""}`}
        >
          <Text className="text-2xl text-text-primary">{props.label}</Text>
        </View>
      )}
    </Pressable>
  );
}
