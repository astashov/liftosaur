import {
  createContext,
  JSX,
  ReactNode,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, Animated, StyleSheet, Platform, BackHandler } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeCustomKeyboard } from "../components/nativeCustomKeyboard.native";
import { IPercentageUnit, IUnit } from "../types";

export interface IKeyboardConfig {
  id: string;
  onInput: (key: string) => void;
  onBlur: () => void;
  onPlus: () => void;
  onMinus: () => void;
  onShowCalculator?: () => void;
  onChangeUnits?: (unit: IUnit | IPercentageUnit) => void;
  allowDot?: boolean;
  allowNegative?: boolean;
  isNegative: boolean;
  withDot: boolean;
  keyboardAddon?: ReactNode;
  enableCalculator?: boolean;
  enableUnits?: (IUnit | IPercentageUnit)[];
  selectedUnit?: IUnit | IPercentageUnit;
}

interface ICustomKeyboardContextValue {
  height: number;
  animatedHeight: Animated.Value;
  measuredHeightRef: RefObject<number>;
  activeId: string | null;
  setHeight: (h: number) => void;
  openKeyboard: (config: IKeyboardConfig) => void;
  closeKeyboard: () => void;
}

const defaultAnimatedHeight = new Animated.Value(0);
const defaultMeasuredHeightRef: RefObject<number> = { current: 0 };

const CustomKeyboardContext = createContext<ICustomKeyboardContextValue>({
  height: 0,
  animatedHeight: defaultAnimatedHeight,
  measuredHeightRef: defaultMeasuredHeightRef,
  activeId: null,
  setHeight: () => undefined,
  openKeyboard: () => undefined,
  closeKeyboard: () => undefined,
});

export function CustomKeyboardProvider(props: {
  children: ReactNode;
  applySafeAreaBottom?: boolean;
  inline?: boolean;
  noShadow?: boolean;
}): JSX.Element {
  const [height, setHeight] = useState(0);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const measuredHeightRef = useRef(0);
  const [activeConfig, setActiveConfig] = useState<IKeyboardConfig | null>(null);
  const [renderedConfig, setRenderedConfig] = useState<IKeyboardConfig | null>(null);
  const [shouldMount, setShouldMount] = useState(false);
  const slideY = useRef(new Animated.Value(400)).current;
  const prevActiveRef = useRef<IKeyboardConfig | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; openGen: number } | null>(null);
  const openGenRef = useRef(0);
  const insets = useSafeAreaInsets();
  const bottomOverflow = props.applySafeAreaBottom === false ? insets.bottom : 0;

  useEffect(() => {
    const animation = Animated.timing(animatedHeight, {
      toValue: height,
      duration: height > 0 ? 250 : 200,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [height, animatedHeight]);

  useEffect(() => {
    const prev = prevActiveRef.current;
    if (activeConfig) {
      setRenderedConfig(activeConfig);
      if (!prev) {
        setShouldMount(true);
        const startVal = measuredHeightRef.current > 0 ? measuredHeightRef.current : 400;
        slideY.setValue(startVal);
        Animated.timing(slideY, { toValue: 0, duration: 250, useNativeDriver: Platform.OS !== "web" }).start();
      }
    } else if (prev) {
      const endVal = measuredHeightRef.current > 0 ? measuredHeightRef.current : 400;
      Animated.timing(slideY, { toValue: endVal, duration: 200, useNativeDriver: Platform.OS !== "web" }).start(
        ({ finished }) => {
          if (finished) {
            setShouldMount(false);
            setRenderedConfig(null);
          }
        }
      );
    }
    prevActiveRef.current = activeConfig;
  }, [activeConfig, slideY]);

  const openKeyboard = useCallback((config: IKeyboardConfig) => {
    openGenRef.current += 1;
    setActiveConfig(config);
    if (measuredHeightRef.current > 0) {
      setHeight(measuredHeightRef.current);
    }
  }, []);

  const closeKeyboard = useCallback(() => {
    setActiveConfig(null);
    setHeight(0);
  }, []);

  const isKeyboardOpen = activeConfig != null;
  useEffect(() => {
    if (Platform.OS !== "android" || !isKeyboardOpen) {
      return;
    }
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      closeKeyboard();
      return true;
    });
    return () => subscription.remove();
  }, [isKeyboardOpen, closeKeyboard]);

  const activeId = activeConfig?.id ?? null;
  const value = useMemo(
    () => ({
      height,
      animatedHeight,
      measuredHeightRef,
      activeId,
      setHeight,
      openKeyboard,
      closeKeyboard,
    }),
    [height, animatedHeight, activeId, openKeyboard, closeKeyboard]
  );

  const inlineOnAndroid = props.inline && Platform.OS === "android";

  const keyboardNode = renderedConfig && (
    <NativeCustomKeyboard
      onInput={renderedConfig.onInput}
      onBlur={renderedConfig.onBlur}
      onPlus={renderedConfig.onPlus}
      onMinus={renderedConfig.onMinus}
      onShowCalculator={renderedConfig.onShowCalculator}
      onChangeUnits={renderedConfig.onChangeUnits}
      allowDot={renderedConfig.allowDot}
      allowNegative={renderedConfig.allowNegative}
      isNegative={renderedConfig.isNegative}
      withDot={renderedConfig.withDot}
      keyboardAddon={renderedConfig.keyboardAddon}
      enableCalculator={renderedConfig.enableCalculator}
      enableUnits={renderedConfig.enableUnits}
      selectedUnit={renderedConfig.selectedUnit}
      applySafeAreaBottom={props.applySafeAreaBottom}
      noShadow={props.noShadow}
    />
  );

  return (
    <CustomKeyboardContext.Provider value={value}>
      <View
        style={inlineOnAndroid ? undefined : { flex: 1 }}
        onTouchStart={(e) => {
          if (activeConfig == null) {
            return;
          }
          const t = e.nativeEvent.touches[0];
          if (!t) {
            return;
          }
          touchStartRef.current = { x: t.pageX, y: t.pageY, openGen: openGenRef.current };
        }}
        onTouchEnd={(e) => {
          const start = touchStartRef.current;
          touchStartRef.current = null;
          if (!start || activeConfig == null) {
            return;
          }
          if (openGenRef.current !== start.openGen) {
            return;
          }
          const t = e.nativeEvent.changedTouches[0];
          if (!t) {
            return;
          }
          const dx = t.pageX - start.x;
          const dy = t.pageY - start.y;
          if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
            closeKeyboard();
          }
        }}
        onTouchCancel={() => {
          touchStartRef.current = null;
        }}
      >
        {props.children}
      </View>
      {shouldMount &&
        (inlineOnAndroid ? (
          <View>
            <Animated.View style={{ height: animatedHeight }} />
            <View style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
              <Animated.View style={{ transform: [{ translateY: slideY }] }}>{keyboardNode}</Animated.View>
            </View>
          </View>
        ) : (
          <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { bottom: -bottomOverflow }]}>
            <View pointerEvents="box-none" className="flex-1 justify-end">
              <Animated.View style={{ transform: [{ translateY: slideY }] }}>{keyboardNode}</Animated.View>
            </View>
          </View>
        ))}
    </CustomKeyboardContext.Provider>
  );
}

export function useCustomKeyboardHeight(): number {
  return useContext(CustomKeyboardContext).height;
}

export function useCustomKeyboardAnimatedHeight(): Animated.Value {
  return useContext(CustomKeyboardContext).animatedHeight;
}

export function useSetCustomKeyboardHeight(): (height: number) => void {
  return useContext(CustomKeyboardContext).setHeight;
}

export function useMeasuredKeyboardHeightRef(): RefObject<number> {
  return useContext(CustomKeyboardContext).measuredHeightRef;
}

export function useCustomKeyboardActiveId(): string | null {
  return useContext(CustomKeyboardContext).activeId;
}

export function useOpenCustomKeyboard(): (config: IKeyboardConfig) => void {
  return useContext(CustomKeyboardContext).openKeyboard;
}

export function useCloseCustomKeyboard(): () => void {
  return useContext(CustomKeyboardContext).closeKeyboard;
}
