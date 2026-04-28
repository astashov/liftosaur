import { JSX, ReactNode, useCallback } from "react";
import { View, Pressable, Platform, LayoutChangeEvent } from "react-native";
import { Text } from "./primitives/text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconKeyboardClose } from "./icons/iconKeyboardClose";
import { IconBackspace } from "./icons/iconBackspace";
import { IconCalculator } from "./icons/iconCalculator";
import { IPercentageUnit, IUnit } from "../types";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { useMeasuredKeyboardHeightRef, useSetCustomKeyboardHeight } from "../navigation/CustomKeyboardContext";

export interface INativeCustomKeyboardProps {
  onInput: (value: string) => void;
  onBlur: () => void;
  onPlus: () => void;
  onMinus: () => void;
  allowDot?: boolean;
  allowNegative?: boolean;
  isNegative: boolean;
  withDot: boolean;
  keyboardAddon?: ReactNode;
  enableCalculator?: boolean;
  onShowCalculator?: () => void;
  enableUnits?: (IUnit | IPercentageUnit)[];
  onChangeUnits?: (unit: IUnit | IPercentageUnit) => void;
  selectedUnit?: IUnit | IPercentageUnit;
  applySafeAreaBottom?: boolean;
}

const KEY_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
];

const keyboardShadowStyle = Platform.select({
  ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 4 },
  android: { elevation: 4 },
  default: {},
});

export function NativeCustomKeyboard(props: INativeCustomKeyboardProps): JSX.Element {
  const insets = useSafeAreaInsets();
  const applySafeAreaBottom = props.applySafeAreaBottom !== false;
  const bottomPadding = applySafeAreaBottom ? insets.bottom : 0;
  const setKeyboardHeight = useSetCustomKeyboardHeight();
  const measuredHeightRef = useMeasuredKeyboardHeightRef();

  const lastRow = [props.allowNegative ? "-" : "", "0", props.allowDot ? "." : ""];

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h > 0) {
        measuredHeightRef.current = h;
        setKeyboardHeight(h);
      }
    },
    [setKeyboardHeight, measuredHeightRef]
  );

  return (
    <View
      onLayout={onLayout}
      className="bg-background-default"
      style={[{ paddingBottom: bottomPadding }, keyboardShadowStyle]}
    >
      {(props.keyboardAddon || props.enableCalculator) && (
        <View className="flex-row items-center gap-2 px-4 bg-background-subtle">
          <View className="flex-1">{props.keyboardAddon}</View>
          {props.enableCalculator && (
            <Pressable
              testID="keyboard-rm-calculator"
              data-cy="keyboard-rm-calculator" data-testid="keyboard-rm-calculator"
              onPress={props.onShowCalculator}
              className="flex-row items-center justify-center w-24 px-2 py-1 border rounded border-border-cardpurple bg-background-cardpurple my-2"
            >
              <Text className="mr-2">RM</Text>
              <IconCalculator size={14} />
            </Pressable>
          )}
        </View>
      )}

      <View className="flex-row gap-4 p-4">
        <View className="flex-1 gap-2">
          {KEY_ROWS.map((row, rowIndex) => (
            <View key={rowIndex} className="flex-row gap-2">
              {row.map((key) => (
                <KeyButton key={key} label={key} onPress={() => props.onInput(key)} />
              ))}
            </View>
          ))}
          <View className="flex-row gap-2">
            {lastRow.map((key, i) =>
              key ? (
                <KeyButton key={key} label={key} onPress={() => props.onInput(key)} />
              ) : (
                <View key={`empty-${i}`} className="flex-1" />
              )
            )}
          </View>
        </View>

        <View className="w-24 mt-2">
          <Pressable
            testID="keyboard-close"
            data-cy="keyboard-close" data-testid="keyboard-close"
            onPress={props.onBlur}
            className="w-full pt-2 pb-1 border rounded border-border-cardpurple bg-background-cardpurple items-center justify-center mb-4"
          >
            <IconKeyboardClose />
          </Pressable>

          <View className="flex-row gap-1">
            <Pressable
              testID="keyboard-minus"
              data-cy="keyboard-minus" data-testid="keyboard-minus"
              onPress={props.onMinus}
              className="flex-1 p-2 border rounded rounded-r-none border-border-cardpurple bg-background-cardpurple items-center justify-center"
            >
              <Text className="text-icon-neutral">-</Text>
            </Pressable>
            <Pressable
              testID="keyboard-plus"
              data-cy="keyboard-plus" data-testid="keyboard-plus"
              onPress={props.onPlus}
              className="flex-1 p-2 border rounded rounded-l-none border-border-cardpurple bg-background-cardpurple items-center justify-center"
            >
              <Text className="text-icon-neutral">+</Text>
            </Pressable>
          </View>

          {props.enableUnits && props.selectedUnit ? (
            <View className="flex-row items-center h-10 gap-2 mt-4">
              {props.enableUnits.map((unit) => (
                <Pressable
                  key={unit}
                  testID={`keyboard-unit-${unit}`}
                  data-cy={`keyboard-unit-${unit}`} data-testid={`keyboard-unit-${unit}`}
                  onPress={() => props.onChangeUnits?.(unit)}
                  className={`flex-1 aspect-square border rounded items-center justify-center ${
                    unit === props.selectedUnit
                      ? "border-border-prominent bg-background-cardpurpleselected"
                      : "border-border-cardpurple bg-background-cardpurple"
                  }`}
                >
                  <Text className="text-icon-neutral">{unit}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View className="h-10 mt-4" />
          )}

          <Pressable
            testID="keyboard-backspace"
            data-cy="keyboard-backspace" data-testid="keyboard-backspace"
            onPress={() => props.onInput("⌫")}
            className="w-full h-10 mt-4 border rounded border-border-cardpurple bg-background-cardpurple items-center justify-center"
          >
            <IconBackspace />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function KeyButton(props: { label: string; onPress: () => void }): JSX.Element {
  const semantic = Tailwind_semantic();
  return (
    <Pressable
      testID={`keyboard-button-${props.label}`}
      data-cy={`keyboard-button-${props.label}`} data-testid={`keyboard-button-${props.label}`}
      onPress={props.onPress}
      className="flex-1 p-2 items-center rounded"
      style={({ pressed }) => ({
        backgroundColor: pressed ? semantic.background.neutral : semantic.background.default,
      })}
    >
      <Text className="text-2xl text-text-primary">{props.label}</Text>
    </Pressable>
  );
}
