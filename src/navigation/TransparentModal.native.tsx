import { JSX, ReactNode, createContext, useContext, useEffect, useRef, useCallback } from "react";
import {
  View,
  Pressable,
  Animated,
  PanResponder,
  PanResponderInstance,
  useWindowDimensions,
  ViewStyle,
  StyleProp,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCustomKeyboardHeight } from "./CustomKeyboardContext";
import { Tailwind_isDark } from "../utils/tailwindConfig";

// Matches the radius iOS gives formSheets, so both kinds of sheet read the same.
const SHEET_CORNER_RADIUS = 24;

interface IProps {
  children: ReactNode;
  onClose: () => void;
  // Pre-animation veto: the sheet slides out before onClose fires, so any "discard
  // changes?" confirmation must happen here, while the sheet is still visible.
  shouldClose?: () => boolean | Promise<boolean>;
  fitContent?: boolean;
  // Rendered inside the bottom safe-area band (normally empty padding). The band keeps
  // at least the inset height so the content sits in it rather than pushing the sheet up;
  // on devices without a bottom inset it grows to fit the content instead.
  safeAreaContent?: ReactNode;
}

const SheetPanContext = createContext<PanResponderInstance | null>(null);

export function SheetDragHandle(props: {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
}): JSX.Element {
  const pan = useContext(SheetPanContext);
  return (
    <View {...(pan ? pan.panHandlers : {})} className={props.className} style={props.style}>
      {props.children}
    </View>
  );
}

export function TransparentModal(props: IProps): JSX.Element {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useCustomKeyboardHeight();
  const sheetHeight = Math.round(screenHeight * 0.85);
  const translateY = useRef(new Animated.Value(sheetHeight)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  // Dimming does nothing over a black background, so dark mode lifts the covered content
  // instead of darkening it - the sheet stays the darker of the two surfaces.
  const isDark = Tailwind_isDark();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: isDark ? 0.1 : 0.5, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const shouldCloseRef = useRef(props.shouldClose);
  shouldCloseRef.current = props.shouldClose;

  const handleClose = useCallback(async () => {
    if (shouldCloseRef.current != null && !(await shouldCloseRef.current())) {
      // A drag-to-dismiss can leave the sheet partially dragged down; snap it back.
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      return;
    }
    Animated.parallel([
      Animated.timing(translateY, { toValue: sheetHeight, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      props.onClose();
    });
  }, [sheetHeight, props.onClose]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          translateY.setValue(gs.dy);
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 100 || gs.vy > 0.5) {
          handleClose();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        }
      },
    })
  ).current;

  return (
    <SheetPanContext.Provider value={panResponder}>
      <View className="justify-end flex-1">
        <Animated.View
          className="absolute inset-0"
          style={{ backgroundColor: isDark ? "white" : "black", opacity: overlayOpacity }}
        >
          <Pressable className="absolute inset-0" onPress={handleClose} />
        </Animated.View>
        <Animated.View
          className="overflow-hidden bg-background-default"
          style={{
            ...(props.fitContent ? null : { height: sheetHeight + insets.bottom + keyboardHeight }),
            paddingBottom: props.safeAreaContent != null ? 0 : insets.bottom + keyboardHeight,
            borderTopLeftRadius: SHEET_CORNER_RADIUS,
            borderTopRightRadius: SHEET_CORNER_RADIUS,
            transform: [{ translateY }],
          }}
        >
          <SheetDragHandle className="items-center py-2">
            <View className="rounded-full bg-text-disabled" style={{ width: 36, height: 5 }} />
          </SheetDragHandle>
          {/* flex-1 collapses to zero height inside the auto-height (fitContent) sheet */}
          {Platform.OS === "android" && !props.fitContent ? (
            <View className="flex-1">{props.children}</View>
          ) : (
            props.children
          )}
          {props.safeAreaContent != null ? (
            Platform.OS === "android" ? (
              // Android's gesture bar is drawn across the inset band itself (not hugging
              // the bottom edge like the iOS home indicator), so the content must sit
              // above the inset, not inside it — nudged a few pt in so the gap doesn't
              // read as a full empty row.
              <View style={{ paddingBottom: Math.max(0, insets.bottom - 8) + keyboardHeight }}>
                {props.safeAreaContent}
              </View>
            ) : (
              // Top-aligned, not centered: centering would push the content down into the
              // home-indicator bar.
              <View style={{ minHeight: insets.bottom + keyboardHeight, paddingTop: 2 }}>{props.safeAreaContent}</View>
            )
          ) : null}
        </Animated.View>
      </View>
    </SheetPanContext.Provider>
  );
}
