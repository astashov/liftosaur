import { JSX, ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
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
import { useReportSheetHeight } from "./ActiveSheetHeightContext";
import { SheetExpansionContext } from "./SheetExpansionContext";
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
  // The sheet resizes as its content and the custom keypad grow, so repositioning floating UI
  // above it would make it hop around - and at any size it can cover the sheet's own keypad.
  useReportSheetHeight(true);
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

  // Expansion grows the sheet upwards from its content-sized self; dismissal slides the whole
  // thing down. One drag runs through both, in that order, so the handle stays under the finger
  // the whole way: past its collapsed height the sheet shrinks back, and only once it's there
  // does further pulling start to dismiss it.
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [collapsedHeight, setCollapsedHeight] = useState(0);
  const dragOffset = useRef(new Animated.Value(0)).current;
  const isExpandedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const expandRangeRef = useRef(0);
  const dragBaseRef = useRef(0);
  const settleGenRef = useRef(0);
  const setExpanded = useCallback((value: boolean) => {
    isExpandedRef.current = value;
    setIsExpanded(value);
  }, []);
  const setDragging = useCallback((value: boolean) => {
    isDraggingRef.current = value;
    setIsDragging(value);
  }, []);
  // The content measures its own collapsed height, but only the sheet knows whether what it just
  // laid out is that or a height the drag asked for - and a mid-animation one recorded here would
  // shrink the expand range for good.
  const reportCollapsedHeight = useCallback((height: number) => {
    if (!isDraggingRef.current && !isExpandedRef.current) {
      setCollapsedHeight(height);
    }
  }, []);
  // Settling can be cut short - setValue stops a running animation, and a stopped one still calls
  // back. Only the settle that is still the current one may end the drag; a re-grab supersedes it.
  const settle = useCallback((toValue: number, snapBack: boolean) => {
    const generation = settleGenRef.current + 1;
    settleGenRef.current = generation;
    const animations = [Animated.spring(dragOffset, { toValue, useNativeDriver: false, bounciness: 0 })];
    if (snapBack) {
      animations.push(Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }));
    }
    Animated.parallel(animations).start(() => {
      if (settleGenRef.current === generation) {
        setDragging(false);
      }
    });
  }, []);
  const setExpandRange = useCallback((range: number) => {
    expandRangeRef.current = range;
    // The cap moves with the keypad, so an already-expanded sheet has to follow it there.
    if (isExpandedRef.current) {
      dragOffset.setValue(range);
    }
  }, []);
  const expansion = useMemo(
    () => ({
      isExpanded,
      isDragging,
      dragOffset,
      collapsedHeight,
      setCollapsedHeight: reportCollapsedHeight,
      setExpandRange,
    }),
    [isExpanded, isDragging, dragOffset, collapsedHeight, reportCollapsedHeight, setExpandRange]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderGrant: () => {
        settleGenRef.current += 1;
        dragBaseRef.current = isExpandedRef.current ? expandRangeRef.current : 0;
        // Grabbing again before the sheet has settled picks it up where it actually is, rather
        // than where the detent it was heading for says it should be.
        dragOffset.stopAnimation((value) => {
          dragBaseRef.current = value;
        });
        setDragging(true);
      },
      onPanResponderMove: (_, gs) => {
        const offset = dragBaseRef.current - gs.dy;
        dragOffset.setValue(Math.max(0, Math.min(offset, expandRangeRef.current)));
        translateY.setValue(Math.max(0, -offset));
      },
      onPanResponderRelease: (_, gs) => {
        const range = expandRangeRef.current;
        const offset = dragBaseRef.current - gs.dy;
        const isFling = Math.abs(gs.vy) > 0.5;
        const isDismiss = offset < 0 && (-offset > 100 || (isFling && gs.vy > 0));
        const expand = !isDismiss && range > 0 && (isFling ? gs.vy < 0 : offset > range / 2);
        setExpanded(expand);
        // Dismissal owns translateY from here (and puts it back itself if shouldClose vetoes),
        // but the height still settles, so a vetoed close lands on a real detent.
        settle(expand ? range : 0, !isDismiss);
        if (isDismiss) {
          handleClose();
        }
      },
      onPanResponderTerminate: () => {
        settle(isExpandedRef.current ? expandRangeRef.current : 0, true);
      },
    })
  ).current;

  return (
    <SheetPanContext.Provider value={panResponder}>
      <SheetExpansionContext.Provider value={expansion}>
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
                <View style={{ minHeight: insets.bottom + keyboardHeight, paddingTop: 2 }}>
                  {props.safeAreaContent}
                </View>
              )
            ) : null}
          </Animated.View>
        </View>
      </SheetExpansionContext.Provider>
    </SheetPanContext.Provider>
  );
}
