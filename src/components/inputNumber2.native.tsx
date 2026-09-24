import {
  JSX,
  memo,
  MutableRefObject,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, Pressable, Animated, ScrollView, Dimensions, LayoutChangeEvent } from "react-native";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { Text } from "./primitives/text";
import { StringUtils_dashcase } from "../utils/string";
import { n, MathUtils_clamp } from "../utils/math";
import { IPercentageUnit, IUnit } from "../types";
import { useModal } from "../navigation/ModalStateContext";
import { useRem } from "../utils/useRem";
import { FitText_fontSize } from "../utils/fitText";
import { NavScreenScrollContext } from "../navigation/NavScreenContent";
import {
  IKeyboardConfig,
  useCloseCustomKeyboard,
  useMeasuredKeyboardHeightRef,
  useOpenCustomKeyboard,
} from "../navigation/CustomKeyboardContext";
import {
  KeyboardActiveId_get,
  KeyboardActiveId_set,
  useIsKeyboardActive,
  useKeyboardHeightIfActive,
} from "../navigation/keyboardActiveId";
import { FocusedInputFlush_register, FocusedInputFlush_unregister } from "../utils/focusedInputFlush";
import { lg } from "../utils/posthog";

export type IInputCommitMode = "live" | "debounced" | "blur";

const HAPTIC_OPTIONS = { enableVibrateFallback: false, ignoreAndroidSystemSettings: false };
// A line height of 1.0 clips the glyph top on iOS. 0.23 measured to within one screen pixel of
// centered digits, with the flex parent centering the margin box.
const LARGE_LINE_HEIGHT = 1.2;
const LARGE_DIGIT_TOP_MARGIN = 0.23;
const LARGE_CURSOR_HEIGHT = 0.8;

interface IInputNumber2Props {
  name: string;
  placeholder?: string;
  value?: number;
  width?: number;
  autowidth?: boolean;
  size?: "md" | "lg";
  fill?: boolean;
  step?: number;
  min?: number;
  max?: number;
  tabIndex?: number;
  tabStop?: boolean;
  initialValue?: number;
  onNext?: (value: number | undefined) => number;
  onPrev?: (value: number | undefined) => number;
  onInput?: (value: number | undefined) => void;
  onPreview?: (value: number | undefined) => void;
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
  inputCommitMode?: IInputCommitMode;
  inputDebounceMs?: number;
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

function InputCursor(props: { fontSize?: number }): JSX.Element {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);
  if (props.fontSize == null) {
    return <Animated.View className="w-px h-scaled-3 bg-background-darkgray" style={{ opacity }} />;
  }
  const height = Math.round(props.fontSize * LARGE_CURSOR_HEIGHT);
  return <Animated.View className="w-0.5 bg-background-darkgray" style={{ opacity, height }} />;
}

type IRepMaxCalculatorOpener = (data: { unit: "kg" | "lb" }) => void;

function RepMaxCalculatorBridge(props: {
  openerRef: MutableRefObject<IRepMaxCalculatorOpener | undefined>;
  onResult: (weightValue: number) => void;
}): null {
  const onResultRef = useRef(props.onResult);
  onResultRef.current = props.onResult;
  props.openerRef.current = useModal("repMaxCalculatorModal", (weightValue) => {
    onResultRef.current(weightValue);
  });
  return null;
}

interface IInputKeypadControllerProps {
  myId: string;
  pressableRef: MutableRefObject<View | null>;
  valueRef: MutableRefObject<string>;
  onInput: (key: string) => void;
  onPlus: () => void;
  onMinus: () => void;
  flushPendingInput: () => void;
  openCalculatorRef: MutableRefObject<IRepMaxCalculatorOpener | undefined>;
  allowDot?: boolean;
  allowNegative?: boolean;
  keyboardAddon?: ReactNode;
  enableCalculator?: boolean;
  enableUnits?: (IUnit | IPercentageUnit)[];
  selectedUnit?: IUnit | IPercentageUnit;
  onChangeUnits?: (unit: IUnit | IPercentageUnit) => void;
}

function InputKeypadController(props: IInputKeypadControllerProps): null {
  const { myId, pressableRef, valueRef, flushPendingInput, openCalculatorRef } = props;
  const scrollCtx = useContext(NavScreenScrollContext);
  const measuredKeyboardHeightRef = useMeasuredKeyboardHeightRef();
  const keyboardHeight = useKeyboardHeightIfActive(myId);
  const openKeyboard = useOpenCustomKeyboard();
  const closeKeyboard = useCloseCustomKeyboard();

  const scrollIntoView = useCallback(() => {
    const scrollNode = scrollCtx?.scrollRef.current as ScrollView | null;
    const scrollYRef = scrollCtx?.scrollYRef;
    const pressableNode = pressableRef.current;
    if (!scrollNode || !scrollYRef || !pressableNode) {
      return;
    }
    const kh =
      keyboardHeight > 0
        ? keyboardHeight
        : measuredKeyboardHeightRef.current > 0
          ? measuredKeyboardHeightRef.current
          : 260;
    const revealAbove = (visibleBottom: number): void => {
      pressableNode.measure((_fx, _fy, _w, pressH, _pageX, pressPageY) => {
        const pressBottom = pressPageY + pressH;
        if (pressBottom <= visibleBottom) {
          return;
        }
        const delta = pressBottom - visibleBottom;
        scrollNode.scrollTo({ y: Math.max(0, scrollYRef.current + delta), animated: true });
      });
    };
    // Where the keyboard starts, for a host that lets it overlay the scroll area — a screen.
    const overlaidBottom = Dimensions.get("window").height - kh;
    const viewport = scrollCtx.viewportRef.current;
    if (viewport == null) {
      revealAbove(overlaidBottom - 16);
      return;
    }
    // A host can instead dock the keyboard below its scroll area and shorten the area to fit it —
    // a sheet. There the area already ends above the keyboard, and its own bottom is the limit,
    // which is lower than the window's by whatever the sheet draws under the keyboard.
    viewport.measureInWindow((_x, viewportY, _w, viewportH) => {
      revealAbove(Math.min(viewportY + viewportH, overlaidBottom) - 16);
    });
  }, [scrollCtx, keyboardHeight, measuredKeyboardHeightRef, pressableRef]);

  const buildKeyboardConfig = useCallback((): IKeyboardConfig => {
    return {
      id: myId,
      onInput: props.onInput,
      onBlur: closeKeyboard,
      onPlus: props.onPlus,
      onMinus: props.onMinus,
      onShowCalculator: () => {
        flushPendingInput();
        closeKeyboard();
        if (props.selectedUnit && props.selectedUnit !== "%") {
          openCalculatorRef.current?.({ unit: props.selectedUnit as "kg" | "lb" });
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
  }, [
    myId,
    props.onInput,
    props.onPlus,
    props.onMinus,
    closeKeyboard,
    flushPendingInput,
    openCalculatorRef,
    valueRef,
    props.allowDot,
    props.allowNegative,
    props.keyboardAddon,
    props.enableCalculator,
    props.enableUnits,
    props.selectedUnit,
    props.onChangeUnits,
  ]);

  useEffect(() => {
    openKeyboard(buildKeyboardConfig());
  }, [buildKeyboardConfig, openKeyboard]);

  useEffect(() => {
    if (keyboardHeight <= 0) {
      return;
    }
    scrollIntoView();
    // Again once the keypad has finished opening. On a host that docks it above a scroll area
    // rather than over one, the area shortens as it opens, and a scroll issued before that lands
    // is clamped to the shorter scrollable range the old size allowed — leaving the field the
    // reveal was for still under the keypad.
    const timeout = setTimeout(scrollIntoView, 300);
    return () => clearTimeout(timeout);
  }, [keyboardHeight, scrollIntoView]);

  useEffect(() => {
    return () => {
      // Focusing a sibling unmounts this controller after the store names the sibling. Closing here
      // would then shut the sibling's keypad.
      if (KeyboardActiveId_get() === myId) {
        closeKeyboard();
      }
    };
  }, [closeKeyboard, myId]);

  return null;
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
  const onPreviewRef = useRef(props.onPreview);
  const onNextRef = useRef(props.onNext);
  const onPrevRef = useRef(props.onPrev);
  const allowDotRef = useRef(!!props.allowDot);
  const allowNegativeRef = useRef(!!props.allowNegative);
  const minRef = useRef(props.min);
  const maxRef = useRef(props.max);
  const stepRef = useRef(props.step);
  const initialValueRef = useRef(props.initialValue);
  const commitMode: IInputCommitMode = props.inputCommitMode ?? "debounced";
  const debounceMs = props.inputDebounceMs ?? 150;
  const commitModeRef = useRef(commitMode);
  const debounceMsRef = useRef(debounceMs);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingInputRef = useRef<number | undefined>(undefined);
  const hasPendingInputRef = useRef(false);
  const pressableRef = useRef<View>(null);
  const isFocused = useIsKeyboardActive(myId);

  const openCalculatorRef = useRef<IRepMaxCalculatorOpener | undefined>(undefined);
  const onCalculatorResult = useCallback((weightValue: number) => {
    if (debounceTimerRef.current != null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    hasPendingInputRef.current = false;
    pendingInputRef.current = undefined;
    const newValue = clamp(weightValue, minRef.current, maxRef.current);
    valueRef.current = newValue?.toString() ?? "";
    setValue(newValue?.toString() ?? "");
    onPreviewRef.current?.(newValue);
    if (onBlurRef.current) {
      onBlurRef.current(newValue);
    }
  }, []);

  onBlurRef.current = props.onBlur;
  onInputRef.current = props.onInput;
  onPreviewRef.current = props.onPreview;
  onNextRef.current = props.onNext;
  onPrevRef.current = props.onPrev;
  allowDotRef.current = !!props.allowDot;
  allowNegativeRef.current = !!props.allowNegative;
  minRef.current = props.min;
  maxRef.current = props.max;
  stepRef.current = props.step;
  initialValueRef.current = props.initialValue;
  commitModeRef.current = commitMode;
  debounceMsRef.current = debounceMs;

  useEffect(() => {
    if (initialValue === valueRef.current) {
      return;
    }
    if (isTypingRef.current) {
      return;
    }
    valueRef.current = initialValue;
    setValue(initialValue);
  }, [props.value]);

  const commitLocalValue = useCallback(() => {
    if (debounceTimerRef.current != null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    hasPendingInputRef.current = false;
    pendingInputRef.current = undefined;
    setIsTyping(false);
    isTypingRef.current = false;
    const newValueNum = clamp(valueRef.current, minRef.current, maxRef.current);
    valueRef.current = newValueNum != null ? newValueNum.toString() : "";
    setValue(newValueNum != null ? newValueNum.toString() : "");
    onPreviewRef.current?.(newValueNum);
    if (onBlurRef.current) {
      onBlurRef.current(newValueNum);
    }
  }, []);

  const prevFocusedRef = useRef(isFocused);
  useEffect(() => {
    if (prevFocusedRef.current && !isFocused) {
      commitLocalValue();
    }
    prevFocusedRef.current = isFocused;
  }, [isFocused, commitLocalValue]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }
    FocusedInputFlush_register(commitLocalValue);
    return () => {
      FocusedInputFlush_unregister(commitLocalValue);
    };
  }, [isFocused, commitLocalValue]);

  const flushPendingInput = useCallback(() => {
    if (debounceTimerRef.current != null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (hasPendingInputRef.current && onInputRef.current) {
      const pending = pendingInputRef.current;
      hasPendingInputRef.current = false;
      pendingInputRef.current = undefined;
      onInputRef.current(pending);
    }
  }, []);

  const handleInput = useCallback((key: string) => {
    ReactNativeHapticFeedback.trigger("impactLight", HAPTIC_OPTIONS);
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
    } else if (key === "." || key === ",") {
      if (allowDotRef.current && !newValue.includes(".")) {
        newValue += ".";
      }
    } else if (newValue.length < dynMaxLength) {
      newValue += key;
    }
    if (!isTypingRef.current) {
      setIsTyping(true);
      isTypingRef.current = true;
    }
    valueRef.current = newValue;
    setValue(newValue);
    if (!newValue.endsWith(".")) {
      const newValueNum = clamp(newValue, minRef.current, maxRef.current);
      onPreviewRef.current?.(newValueNum);
      if (onInputRef.current) {
        const mode = commitModeRef.current;
        if (mode === "live") {
          onInputRef.current(newValueNum);
        } else if (mode === "debounced") {
          pendingInputRef.current = newValueNum;
          hasPendingInputRef.current = true;
          if (debounceTimerRef.current != null) {
            clearTimeout(debounceTimerRef.current);
          }
          debounceTimerRef.current = setTimeout(() => {
            debounceTimerRef.current = null;
            if (hasPendingInputRef.current && onInputRef.current) {
              const v = pendingInputRef.current;
              hasPendingInputRef.current = false;
              pendingInputRef.current = undefined;
              onInputRef.current(v);
            }
          }, debounceMsRef.current);
        }
      }
    }
  }, []);

  const handlePlus = useCallback(() => {
    ReactNativeHapticFeedback.trigger("impactMedium", HAPTIC_OPTIONS);
    if (debounceTimerRef.current != null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    hasPendingInputRef.current = false;
    pendingInputRef.current = undefined;
    const currentNum = valueRef.current === "" ? (initialValueRef.current ?? 0) : Number(valueRef.current);
    const nextValue = onNextRef.current ? onNextRef.current(currentNum) : currentNum + (stepRef.current ?? 1);
    const newValue = clamp(nextValue, minRef.current, maxRef.current);
    valueRef.current = newValue != null ? newValue.toString() : "";
    setValue(newValue != null ? newValue.toString() : "");
    onPreviewRef.current?.(newValue);
    if (commitModeRef.current !== "blur" && onInputRef.current) {
      onInputRef.current(newValue);
    }
  }, []);

  const handleMinus = useCallback(() => {
    ReactNativeHapticFeedback.trigger("impactMedium", HAPTIC_OPTIONS);
    if (debounceTimerRef.current != null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    hasPendingInputRef.current = false;
    pendingInputRef.current = undefined;
    const currentNum = valueRef.current === "" ? (initialValueRef.current ?? 0) : Number(valueRef.current);
    const prevValue = onPrevRef.current ? onPrevRef.current(currentNum) : currentNum - (stepRef.current ?? 1);
    const newValue = clamp(prevValue, minRef.current, maxRef.current);
    valueRef.current = newValue != null ? newValue.toString() : "";
    setValue(newValue != null ? newValue.toString() : "");
    onPreviewRef.current?.(newValue);
    if (commitModeRef.current !== "blur" && onInputRef.current) {
      onInputRef.current(newValue);
    }
  }, []);

  const focusSelf = useCallback(() => {
    lg(`focus-nm-${props.name}`);
    KeyboardActiveId_set(myId);
  }, [myId, props.name]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }
    if (props.value == null && props.initialValue != null) {
      valueRef.current = props.initialValue.toString();
      setValue(props.initialValue.toString());
    }
  }, [isFocused, props.initialValue]);

  useEffect(() => {
    return () => {
      flushPendingInput();
      if (debounceTimerRef.current != null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (prevFocusedRef.current) {
        const newValueNum = clamp(valueRef.current, minRef.current, maxRef.current);
        if (onBlurRef.current) {
          onBlurRef.current(newValueNum);
        }
        KeyboardActiveId_set(null);
      }
    };
  }, [flushPendingInput]);

  const remValue = useRem();
  const [filledWidth, setFilledWidth] = useState(0);
  const fieldWidth = props.fill ? filledWidth : (props.width ?? 4) * remValue;
  const isLarge = props.size === "lg";

  const fieldClassName = useMemo(
    () =>
      `${isLarge ? "h-scaled-12 rounded-lg" : "h-scaled-6 rounded"} border border-border-prominent bg-background-default flex-row justify-center items-center ${
        props.autowidth ? "px-2" : ""
      }`,
    [props.autowidth, isLarge]
  );
  const fieldStyle = useMemo(
    () => (props.autowidth ? undefined : props.fill ? { flex: 1 } : { width: fieldWidth }),
    [props.autowidth, props.fill, fieldWidth]
  );
  const onFieldLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (props.fill) {
        setFilledWidth(e.nativeEvent.layout.width);
      }
    },
    [props.fill]
  );
  const baseFontSize = ((isLarge ? 32 : 14) * remValue) / 16;
  const availableTextWidth = props.autowidth || fieldWidth === 0 ? 0 : fieldWidth - 6;
  const fontStyleFor = useCallback(
    (text: string) => {
      const fontSize = FitText_fontSize(text, availableTextWidth, baseFontSize);
      return isLarge
        ? {
            fontSize,
            lineHeight: Math.round(fontSize * LARGE_LINE_HEIGHT),
            marginTop: Math.round(fontSize * LARGE_DIGIT_TOP_MARGIN),
            includeFontPadding: false as const,
          }
        : { fontSize };
    },
    [availableTextWidth, baseFontSize, isLarge]
  );
  const valueFontStyle = useMemo(() => fontStyleFor(value ?? ""), [value, fontStyleFor]);
  const placeholderFontStyle = useMemo(() => fontStyleFor(props.placeholder ?? ""), [props.placeholder, fontStyleFor]);

  return (
    <>
      {props.enableCalculator && <RepMaxCalculatorBridge openerRef={openCalculatorRef} onResult={onCalculatorResult} />}
      {isFocused && (
        <InputKeypadController
          myId={myId}
          pressableRef={pressableRef}
          valueRef={valueRef}
          onInput={handleInput}
          onPlus={handlePlus}
          onMinus={handleMinus}
          flushPendingInput={flushPendingInput}
          openCalculatorRef={openCalculatorRef}
          allowDot={props.allowDot}
          allowNegative={props.allowNegative}
          keyboardAddon={props.keyboardAddon}
          enableCalculator={props.enableCalculator}
          enableUnits={props.enableUnits}
          selectedUnit={props.selectedUnit}
          onChangeUnits={props.onChangeUnits}
        />
      )}
      <View ref={pressableRef} collapsable={false} style={props.fill ? { flex: 1 } : undefined}>
        <Pressable
          onPress={focusSelf}
          hitSlop={12}
          testID={`input-${StringUtils_dashcase(props.name)}-field`}
          data-testid={`input-${StringUtils_dashcase(props.name)}-field`}
          className={fieldClassName}
          style={fieldStyle}
          onLayout={onFieldLayout}
        >
          {!value && !isFocused && props.placeholder ? (
            <Text
              className={`${isLarge ? "text-3xl" : "text-sm"} text-text-secondarysubtle`}
              numberOfLines={1}
              style={placeholderFontStyle}
            >
              {props.placeholder}
            </Text>
          ) : (
            <Text
              numberOfLines={1}
              className={`${isLarge ? "text-3xl" : "text-sm"} ${isFocused && !isTypingRef.current ? "bg-background-cardpurpleselected" : ""}`}
              style={valueFontStyle}
            >
              {value}
            </Text>
          )}
          {isFocused && <InputCursor fontSize={isLarge ? valueFontStyle.fontSize : undefined} />}
          {props.showUnitInside && props.selectedUnit && props.value != null && (
            <Text className="text-xs text-text-secondary"> {props.selectedUnit}</Text>
          )}
          {props.after && props.after()}
        </Pressable>
      </View>
    </>
  );
}

export const InputNumber2 = memo(InputNumber2Inner);
