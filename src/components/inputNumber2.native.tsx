import { JSX, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { View, Pressable, Animated, ScrollView, useWindowDimensions, Vibration } from "react-native";
import { Text } from "./primitives/text";
import { StringUtils_dashcase } from "../utils/string";
import { n, MathUtils_clamp } from "../utils/math";
import { IPercentageUnit, IUnit } from "../types";
import { useModal } from "../navigation/ModalStateContext";
import { rem } from "nativewind";
import { NavScreenScrollContext } from "../navigation/NavScreenContent";
import {
  IKeyboardConfig,
  useCloseCustomKeyboard,
  useCustomKeyboardActiveId,
  useMeasuredKeyboardHeightRef,
  useOpenCustomKeyboard,
} from "../navigation/CustomKeyboardContext";

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
  "data-testid"?: string;
  testID?: string;
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

let nextInputId = 1;

function InputNumber2Inner(props: IInputNumber2Props): JSX.Element {
  const initialValue = props.value != null ? n(props.value) : "";
  const [value, setValue] = useState(initialValue);
  const [isTyping, setIsTyping] = useState(false);

  const myIdRef = useRef<string | null>(null);
  if (!myIdRef.current) {
    nextInputId += 1;
    myIdRef.current = `input-${nextInputId}`;
  }
  const myId = myIdRef.current;

  const valueRef = useRef(value);
  const isTypingRef = useRef(isTyping);
  const onBlurRef = useRef(props.onBlur);
  const onInputRef = useRef(props.onInput);
  const onNextRef = useRef(props.onNext);
  const onPrevRef = useRef(props.onPrev);
  const allowDotRef = useRef(!!props.allowDot);
  const allowNegativeRef = useRef(!!props.allowNegative);
  const minRef = useRef(props.min);
  const maxRef = useRef(props.max);
  const stepRef = useRef(props.step);
  const initialValueRef = useRef(props.initialValue);
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const pressableRef = useRef<View>(null);
  const scrollCtx = useContext(NavScreenScrollContext);
  const measuredKeyboardHeightRef = useMeasuredKeyboardHeightRef();
  const openKeyboard = useOpenCustomKeyboard();
  const closeKeyboard = useCloseCustomKeyboard();
  const activeId = useCustomKeyboardActiveId();
  const isFocused = activeId === myId;
  const { height: windowHeight } = useWindowDimensions();

  const openCalculator = useModal("repMaxCalculatorModal", (weightValue) => {
    const newValue = clamp(weightValue, minRef.current, maxRef.current);
    valueRef.current = newValue?.toString() ?? "";
    setValue(newValue?.toString() ?? "");
    if (onBlurRef.current) {
      onBlurRef.current(newValue);
    }
  });

  useEffect(() => {
    onBlurRef.current = props.onBlur;
    onInputRef.current = props.onInput;
    onNextRef.current = props.onNext;
    onPrevRef.current = props.onPrev;
  }, [props.onBlur, props.onInput, props.onNext, props.onPrev]);

  useEffect(() => {
    allowDotRef.current = !!props.allowDot;
    allowNegativeRef.current = !!props.allowNegative;
    minRef.current = props.min;
    maxRef.current = props.max;
    stepRef.current = props.step;
    initialValueRef.current = props.initialValue;
  }, [props.allowDot, props.allowNegative, props.min, props.max, props.step, props.initialValue]);

  useEffect(() => {
    valueRef.current = initialValue;
    setValue(initialValue);
  }, [props.value]);

  useEffect(() => {
    if (isFocused) {
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
  }, [isFocused, cursorOpacity]);

  const prevFocusedRef = useRef(isFocused);
  useEffect(() => {
    if (prevFocusedRef.current && !isFocused) {
      setIsTyping(false);
      isTypingRef.current = false;
      const newValueNum = clamp(valueRef.current, minRef.current, maxRef.current);
      valueRef.current = newValueNum != null ? newValueNum.toString() : "";
      setValue(newValueNum != null ? newValueNum.toString() : "");
      if (onBlurRef.current) {
        onBlurRef.current(newValueNum);
      }
    }
    prevFocusedRef.current = isFocused;
  }, [isFocused]);

  const scrollIntoView = useCallback(() => {
    const scrollNode = scrollCtx?.scrollRef.current as ScrollView | null;
    const scrollYRef = scrollCtx?.scrollYRef;
    const pressableNode = pressableRef.current;
    if (!scrollNode || !scrollYRef || !pressableNode) {
      return;
    }
    const keyboardHeight = measuredKeyboardHeightRef.current > 0 ? measuredKeyboardHeightRef.current : 260;
    const visibleBottom = windowHeight - keyboardHeight - 16;
    pressableNode.measure((_fx, _fy, _w, pressH, _pageX, pressPageY) => {
      const pressBottom = pressPageY + pressH;
      if (pressBottom <= visibleBottom) {
        return;
      }
      const delta = pressBottom - visibleBottom;
      scrollNode.scrollTo({ y: Math.max(0, scrollYRef.current + delta), animated: true });
    });
  }, [scrollCtx, windowHeight, measuredKeyboardHeightRef]);

  const handleInput = useCallback((key: string) => {
    Vibration.vibrate(10);
    let newValue = valueRef.current;
    if (!isTypingRef.current) {
      newValue = "";
    }
    const max = maxRef.current;
    const dynMaxLength =
      (max?.toString().length ?? 5) + (allowDotRef.current ? 3 : 0) + (allowNegativeRef.current ? 1 : 0);
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
    } else if (newValue.length < dynMaxLength) {
      newValue += key;
    }
    setIsTyping(true);
    isTypingRef.current = true;
    valueRef.current = newValue;
    setValue(newValue);
    if (onInputRef.current && !newValue.endsWith(".")) {
      const newValueNum = clamp(newValue, minRef.current, maxRef.current);
      onInputRef.current(newValueNum);
    }
  }, []);

  const handlePlus = useCallback(() => {
    Vibration.vibrate(10);
    const currentNum = valueRef.current === "" ? (initialValueRef.current ?? 0) : Number(valueRef.current);
    const nextValue = onNextRef.current ? onNextRef.current(currentNum) : currentNum + (stepRef.current ?? 1);
    const newValue = clamp(nextValue, minRef.current, maxRef.current);
    valueRef.current = newValue != null ? newValue.toString() : "";
    setValue(newValue != null ? newValue.toString() : "");
    if (onInputRef.current) {
      onInputRef.current(newValue);
    }
  }, []);

  const handleMinus = useCallback(() => {
    Vibration.vibrate(10);
    const currentNum = valueRef.current === "" ? (initialValueRef.current ?? 0) : Number(valueRef.current);
    const prevValue = onPrevRef.current ? onPrevRef.current(currentNum) : currentNum - (stepRef.current ?? 1);
    const newValue = clamp(prevValue, minRef.current, maxRef.current);
    valueRef.current = newValue != null ? newValue.toString() : "";
    setValue(newValue != null ? newValue.toString() : "");
    if (onInputRef.current) {
      onInputRef.current(newValue);
    }
  }, []);

  const focusSelf = useCallback(() => {
    scrollIntoView();
    const config: IKeyboardConfig = {
      id: myId,
      onInput: handleInput,
      onBlur: closeKeyboard,
      onPlus: handlePlus,
      onMinus: handleMinus,
      onShowCalculator: () => {
        closeKeyboard();
        if (props.selectedUnit && props.selectedUnit !== "%") {
          openCalculator({ unit: props.selectedUnit as "kg" | "lb" });
        }
      },
      onChangeUnits: props.onChangeUnits,
      allowDot: props.allowDot,
      allowNegative: props.allowNegative,
      isNegative: typeof valueRef.current === "string" && valueRef.current[0] === "-",
      withDot: typeof valueRef.current === "string" && valueRef.current.includes("."),
      keyboardAddon: props.keyboardAddon,
      enableCalculator: props.enableCalculator,
      enableUnits: props.enableUnits,
      selectedUnit: props.selectedUnit,
    };
    openKeyboard(config);
  }, [
    myId,
    scrollIntoView,
    handleInput,
    handlePlus,
    handleMinus,
    closeKeyboard,
    openKeyboard,
    openCalculator,
    props.allowDot,
    props.allowNegative,
    props.keyboardAddon,
    props.enableCalculator,
    props.enableUnits,
    props.selectedUnit,
    props.onChangeUnits,
  ]);

  useEffect(() => {
    return () => {
      if (prevFocusedRef.current) {
        closeKeyboard();
      }
    };
  }, [closeKeyboard]);

  const remValue = rem.get();
  const fieldWidth = (props.width ?? 4) * remValue;

  const fieldClassName = useMemo(
    () =>
      `h-6 border rounded border-border-prominent bg-background-default flex-row justify-center items-center ${
        props.autowidth ? "px-2" : ""
      }`,
    [props.autowidth]
  );

  return (
    <View ref={pressableRef} collapsable={false}>
      <Pressable
        onPress={focusSelf}
        testID={`input-${StringUtils_dashcase(props.name)}-field`}
        data-testid={`input-${StringUtils_dashcase(props.name)}-field`}
        className={fieldClassName}
        style={props.autowidth ? undefined : { width: fieldWidth }}
      >
        {!value && !isFocused && props.placeholder ? (
          <Text className="text-sm text-text-secondarysubtle" numberOfLines={1}>
            {props.placeholder}
          </Text>
        ) : (
          <Text className={`text-sm ${isFocused && !isTypingRef.current ? "bg-background-cardpurpleselected" : ""}`}>
            {value}
          </Text>
        )}
        {isFocused && <Animated.View className="w-px h-3 bg-background-darkgray" style={{ opacity: cursorOpacity }} />}
        {props.showUnitInside && props.selectedUnit && props.value != null && (
          <Text className="text-xs text-text-secondary"> {props.selectedUnit}</Text>
        )}
        {props.after && props.after()}
      </Pressable>
    </View>
  );
}

export const InputNumber2 = memo(InputNumber2Inner);
