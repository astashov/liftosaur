import { JSX, useCallback, useEffect, useRef, useState } from "react";
import { View, Pressable, Modal, Animated } from "react-native";
import { Text } from "./primitives/text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StringUtils_dashcase } from "../utils/string";
import { IconKeyboardClose } from "./icons/iconKeyboardClose";
import { IconBackspace } from "./icons/iconBackspace";
import { IconCalculator } from "./icons/iconCalculator";
import { n, MathUtils_clamp } from "../utils/math";
import { IPercentageUnit, IUnit } from "../types";
import { useModal } from "../navigation/ModalStateContext";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { rem } from "nativewind";

interface IInputNumber2Props {
  name: string;
  placeholder?: string;
  value?: number;
  width?: number;
  autowidth?: boolean;
  step?: number;
  min?: number;
  max?: number;
  tabIndex?: number;
  initialValue?: number;
  onNext?: (value: number | undefined) => number;
  onPrev?: (value: number | undefined) => number;
  onInput?: (value: number | undefined) => void;
  onBlur?: (value: number | undefined) => void;
  keyboardAddon?: JSX.Element;
  after?: () => JSX.Element | undefined;
  allowDot?: boolean;
  allowNegative?: boolean;
  enableCalculator?: boolean;
  enableUnits?: (IUnit | IPercentageUnit)[];
  onChangeUnits?: (unit: IUnit | IPercentageUnit) => void;
  selectedUnit?: IUnit | IPercentageUnit;
  showUnitInside?: boolean;
}

function clamp(value: string | number, min?: number, max?: number): number | undefined {
  if (value === "") {
    return undefined;
  }
  const num = MathUtils_clamp(Number(value), min, max);
  if (isNaN(num)) {
    return MathUtils_clamp(0, min, max);
  }
  return num;
}

export function InputNumber2(props: IInputNumber2Props): JSX.Element {
  const initialValue = props.value != null ? n(props.value) : "";
  const [value, setValue] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const valueRef = useRef(value);
  const isTypingRef = useRef(isTyping);
  const onBlurRef = useRef(props.onBlur);
  const onInputRef = useRef(props.onInput);
  const allowDotRef = useRef(!!props.allowDot);
  const allowNegativeRef = useRef(!!props.allowNegative);
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  const maxLength = (props.max?.toString().length ?? 5) + (props.allowDot ? 3 : 0) + (props.allowNegative ? 1 : 0);

  const openCalculator = useModal("repMaxCalculatorModal", (weightValue) => {
    const newValue = clamp(weightValue, props.min, props.max);
    valueRef.current = newValue?.toString() ?? "";
    setValue(newValue?.toString() ?? "");
    if (onBlurRef.current) {
      onBlurRef.current(newValue);
    }
  });

  useEffect(() => {
    onBlurRef.current = props.onBlur;
    onInputRef.current = props.onInput;
  }, [props.onBlur, props.onInput]);

  useEffect(() => {
    allowDotRef.current = !!props.allowDot;
    allowNegativeRef.current = !!props.allowNegative;
  }, [props.allowDot, props.allowNegative]);

  useEffect(() => {
    valueRef.current = initialValue;
    setValue(initialValue);
  }, [props.value]);

  useEffect(() => {
    if (isFocused) {
      if (props.value == null && props.initialValue != null) {
        valueRef.current = props.initialValue.toString();
        setValue(props.initialValue.toString());
      }
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
          Animated.timing(cursorOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
    cursorOpacity.setValue(1);
    return undefined;
  }, [isFocused, props.initialValue]);

  const handleInput = useCallback(
    (key: string) => {
      let newValue = valueRef.current;
      if (!isTypingRef.current) {
        newValue = "";
      }
      if (key === "⌫") {
        newValue = newValue.slice(0, -1);
      } else if (key === "-") {
        if (allowNegativeRef.current) {
          if (newValue[0] === "-") {
            newValue = newValue.slice(1);
          } else if (!newValue.includes("-")) {
            newValue = `-${newValue}`;
          }
        }
      } else if (key === ".") {
        if (allowDotRef.current && !newValue.includes(".")) {
          newValue += key;
        }
      } else if (newValue.length < maxLength) {
        newValue += key;
      }
      setIsTyping(true);
      isTypingRef.current = true;
      valueRef.current = newValue;
      setValue(newValue);
      if (onInputRef.current && !newValue.endsWith(".")) {
        const newValueNum = clamp(newValue, props.min, props.max);
        onInputRef.current(newValueNum);
      }
    },
    [maxLength, props.min, props.max]
  );

  const blur = useCallback(() => {
    setIsFocused(false);
    setIsTyping(false);
    isTypingRef.current = false;
    const newValueNum = clamp(valueRef.current, props.min, props.max);
    valueRef.current = newValueNum != null ? newValueNum.toString() : "";
    setValue(newValueNum != null ? newValueNum.toString() : "");
    if (onBlurRef.current) {
      onBlurRef.current(newValueNum);
    }
  }, [props.min, props.max]);

  const handlePlus = useCallback(() => {
    const nextValue = props.onNext ? props.onNext(Number(value)) : Number(value) + (props.step ?? 1);
    const newValue = clamp(nextValue, props.min, props.max);
    valueRef.current = newValue != null ? newValue.toString() : "";
    setValue(newValue != null ? newValue.toString() : "");
    if (onInputRef.current) {
      onInputRef.current(newValue);
    }
  }, [value, props.onNext, props.step, props.min, props.max]);

  const handleMinus = useCallback(() => {
    const prevValue = props.onPrev ? props.onPrev(Number(value)) : Number(value) - (props.step ?? 1);
    const newValue = clamp(prevValue, props.min, props.max);
    valueRef.current = newValue != null ? newValue.toString() : "";
    setValue(newValue != null ? newValue.toString() : "");
    if (onInputRef.current) {
      onInputRef.current(newValue);
    }
  }, [value, props.onPrev, props.step, props.min, props.max]);

  const semantic = Tailwind_semantic();
  const remValue = rem.get();
  const fieldWidth = (props.width ?? 4) * remValue;

  return (
    <>
      <Pressable
        onPress={() => setIsFocused(true)}
        testID={`input-${StringUtils_dashcase(props.name)}-field`}
        data-cy={`input-${StringUtils_dashcase(props.name)}-field`}
        style={[
          {
            height: 24,
            borderWidth: 1,
            borderRadius: 4,
            borderColor: semantic.border.prominent,
            backgroundColor: semantic.background.default,
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "row",
          },
          props.autowidth ? { paddingHorizontal: 8 } : { width: fieldWidth },
        ]}
      >
        {!value && !isFocused && props.placeholder ? (
          <Text style={{ fontSize: 14, color: semantic.text.secondarysubtle }} numberOfLines={1}>
            {props.placeholder}
          </Text>
        ) : (
          <Text
            style={[
              { fontSize: 14 },
              isFocused && !isTypingRef.current
                ? { backgroundColor: semantic.background.cardpurpleselected }
                : undefined,
            ]}
          >
            {value}
          </Text>
        )}
        {isFocused && (
          <Animated.View
            style={{
              width: 1,
              height: 12,
              backgroundColor: semantic.background.darkgray,
              opacity: cursorOpacity,
            }}
          />
        )}
        {props.showUnitInside && props.selectedUnit && props.value != null && (
          <Text style={{ fontSize: 12, color: semantic.text.secondary }}> {props.selectedUnit}</Text>
        )}
        {props.after && props.after()}
      </Pressable>

      <Modal transparent visible={isFocused} animationType="none" statusBarTranslucent>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable style={{ flex: 1 }} onPress={blur} />
          <NativeCustomKeyboard
            onInput={handleInput}
            onBlur={blur}
            onPlus={handlePlus}
            onMinus={handleMinus}
            allowDot={props.allowDot}
            allowNegative={props.allowNegative}
            isNegative={typeof value === "string" && value[0] === "-"}
            withDot={typeof value === "string" && value.includes(".")}
            keyboardAddon={props.keyboardAddon}
            enableCalculator={props.enableCalculator}
            onShowCalculator={() => {
              blur();
              if (props.selectedUnit && props.selectedUnit !== "%") {
                openCalculator({ unit: props.selectedUnit as "kg" | "lb" });
              }
            }}
            enableUnits={props.enableUnits}
            onChangeUnits={props.onChangeUnits}
            selectedUnit={props.selectedUnit}
          />
        </View>
      </Modal>
    </>
  );
}

interface INativeCustomKeyboardProps {
  onInput: (value: string) => void;
  onBlur: () => void;
  onPlus: () => void;
  onMinus: () => void;
  allowDot?: boolean;
  allowNegative?: boolean;
  isNegative: boolean;
  withDot: boolean;
  keyboardAddon?: JSX.Element;
  enableCalculator?: boolean;
  onShowCalculator?: () => void;
  enableUnits?: (IUnit | IPercentageUnit)[];
  onChangeUnits?: (unit: IUnit | IPercentageUnit) => void;
  selectedUnit?: IUnit | IPercentageUnit;
}

const KEY_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
];

function NativeCustomKeyboard(props: INativeCustomKeyboardProps): JSX.Element {
  const insets = useSafeAreaInsets();
  const semantic = Tailwind_semantic();

  const lastRow = [props.allowNegative ? "-" : "", "0", props.allowDot ? "." : ""];

  return (
    <View style={{ backgroundColor: semantic.background.default, paddingBottom: insets.bottom }}>
      {(props.keyboardAddon || props.enableCalculator) && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 16,
            backgroundColor: semantic.background.subtle,
          }}
        >
          <View style={{ flex: 1 }}>{props.keyboardAddon}</View>
          {props.enableCalculator && (
            <Pressable
              testID="keyboard-rm-calculator"
              data-cy="keyboard-rm-calculator"
              onPress={props.onShowCalculator}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                width: 96,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderWidth: 1,
                borderRadius: 4,
                borderColor: semantic.border.cardpurple,
                backgroundColor: semantic.background.cardpurple,
                marginVertical: 8,
              }}
            >
              <Text style={{ marginRight: 8 }}>RM</Text>
              <IconCalculator size={14} />
            </Pressable>
          )}
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 16, padding: 16 }}>
        <View style={{ flex: 1, gap: 8 }}>
          {KEY_ROWS.map((row, rowIndex) => (
            <View key={rowIndex} style={{ flexDirection: "row", gap: 8 }}>
              {row.map((key) => (
                <KeyButton key={key} label={key} onPress={() => props.onInput(key)} />
              ))}
            </View>
          ))}
          <View style={{ flexDirection: "row", gap: 8 }}>
            {lastRow.map((key, i) =>
              key ? (
                <KeyButton key={key} label={key} onPress={() => props.onInput(key)} />
              ) : (
                <View key={`empty-${i}`} style={{ flex: 1 }} />
              )
            )}
          </View>
        </View>

        <View style={{ width: 96, marginTop: 8 }}>
          <Pressable
            testID="keyboard-close"
            data-cy="keyboard-close"
            onPress={props.onBlur}
            style={{
              width: "100%",
              paddingTop: 8,
              paddingBottom: 4,
              borderWidth: 1,
              borderRadius: 4,
              borderColor: semantic.border.cardpurple,
              backgroundColor: semantic.background.cardpurple,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <IconKeyboardClose />
          </Pressable>

          <View style={{ flexDirection: "row", gap: 4 }}>
            <Pressable
              testID="keyboard-minus"
              data-cy="keyboard-minus"
              onPress={props.onMinus}
              style={{
                flex: 1,
                padding: 8,
                borderWidth: 1,
                borderRadius: 4,
                borderTopRightRadius: 0,
                borderBottomRightRadius: 0,
                borderColor: semantic.border.cardpurple,
                backgroundColor: semantic.background.cardpurple,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: semantic.icon.neutral }}>-</Text>
            </Pressable>
            <Pressable
              testID="keyboard-plus"
              data-cy="keyboard-plus"
              onPress={props.onPlus}
              style={{
                flex: 1,
                padding: 8,
                borderWidth: 1,
                borderRadius: 4,
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
                borderColor: semantic.border.cardpurple,
                backgroundColor: semantic.background.cardpurple,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: semantic.icon.neutral }}>+</Text>
            </Pressable>
          </View>

          {props.enableUnits && props.selectedUnit ? (
            <View style={{ flexDirection: "row", alignItems: "center", height: 40, gap: 8, marginTop: 16 }}>
              {props.enableUnits.map((unit) => (
                <Pressable
                  key={unit}
                  testID={`keyboard-unit-${unit}`}
                  data-cy={`keyboard-unit-${unit}`}
                  onPress={() => props.onChangeUnits?.(unit)}
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    borderWidth: 1,
                    borderRadius: 4,
                    borderColor:
                      unit === props.selectedUnit ? semantic.border.prominent : semantic.border.cardpurple,
                    backgroundColor:
                      unit === props.selectedUnit
                        ? semantic.background.cardpurpleselected
                        : semantic.background.cardpurple,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: semantic.icon.neutral }}>{unit}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={{ height: 40, marginTop: 16 }} />
          )}

          <Pressable
            testID="keyboard-backspace"
            data-cy="keyboard-backspace"
            onPress={() => props.onInput("⌫")}
            style={{
              width: "100%",
              height: 40,
              marginTop: 16,
              borderWidth: 1,
              borderRadius: 4,
              borderColor: semantic.border.cardpurple,
              backgroundColor: semantic.background.cardpurple,
              alignItems: "center",
              justifyContent: "center",
            }}
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
      data-cy={`keyboard-button-${props.label}`}
      onPress={props.onPress}
      style={({ pressed }) => ({
        flex: 1,
        padding: 8,
        alignItems: "center" as const,
        borderRadius: 4,
        backgroundColor: pressed ? semantic.background.neutral : semantic.background.default,
      })}
    >
      <Text style={{ fontSize: 24, color: semantic.text.primary }}>{props.label}</Text>
    </Pressable>
  );
}
