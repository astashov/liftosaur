import { useEffect } from "react";
import { Animated, LayoutChangeEvent, useWindowDimensions, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCustomKeyboardAnimatedHeight, useCustomKeyboardHeight } from "../CustomKeyboardContext";
import { useSheetExpansion } from "../SheetExpansionContext";
import { useRem } from "../../utils/useRem";
import {
  useLiftoEditorSheetFontSize,
  useLiftoEditorSheetLineHeight,
} from "../../components/primitives/liftoEditorMetrics";

const MIN_EDITOR_LINES = 5;
// The `py-3` the editor sits in, top and bottom, at the current rem.
const EDITOR_PADDING_REMS = 1.5;

export interface ILiftoEditorSheetLayout {
  container: Animated.WithAnimatedObject<ViewStyle>;
  body: ViewStyle;
  editor: ViewStyle;
  // Handed out here rather than read from the metrics directly, so the floor below and the text
  // it is a floor of can't drift apart.
  editorFontSize: number;
  onContainerLayout: (event: LayoutChangeEvent) => void;
}

// Both liftoeditor sheets are auto-height: they hug their content, and the nested fit-content
// keyboard host adds inline space below when the keypad opens, growing them. The cap keeps the
// whole sheet (including the docked keypad, which renders below the container) within the
// screen — past it, the editor is the part that shrinks and scrolls.
//
// Collapsed, the editor still holds a floor of a few lines: a one-line exercise would otherwise
// leave the sheet a sliver at the very bottom of the screen, awkward to read and to reach.
// Dragging the sheet's handle up grows the container from there towards the cap, and the editor
// grows into whatever the chrome leaves.
export function useLiftoEditorSheetLayout(): ILiftoEditorSheetLayout {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keypadHeight = useCustomKeyboardHeight();
  const keypadAnimatedHeight = useCustomKeyboardAnimatedHeight();
  const rem = useRem();
  const editorFontSize = useLiftoEditorSheetFontSize();
  const editorLineHeight = useLiftoEditorSheetLineHeight();
  const { isExpanded, isDragging, dragOffset, collapsedHeight, setCollapsedHeight, setExpandRange } =
    useSheetExpansion();
  const floorHeight = windowHeight * 0.25;
  const keypadlessHeight = windowHeight * 0.9 - insets.bottom;
  const maxHeight = Math.max(floorHeight, keypadlessHeight - keypadHeight);
  // The keypad's inline space animates to each new size — opening, closing, and every time its
  // addons change between one token and the next. The cap has to ride the same value that space
  // does: reading the settled height instead resizes the sheet a beat before the space beneath
  // it follows, which is the jump. This is `maxHeight` as an animated node, clamp included.
  const animatedMaxHeight = keypadAnimatedHeight.interpolate({
    inputRange: [0, Math.max(1, keypadlessHeight - floorHeight)],
    outputRange: [keypadlessHeight, floorHeight],
    extrapolate: "clamp",
  });
  const minEditorHeight = Math.round(editorLineHeight * MIN_EDITOR_LINES + rem * EDITOR_PADDING_REMS);
  // While the drag owns the height, laying out reports back the height it asked for rather than
  // the one the content wants — so the collapsed height is only readable in between, and holding
  // the container at it the rest of the time would stop the content ever shrinking again.
  const isDriven = isDragging || isExpanded;
  useEffect(() => {
    setExpandRange(Math.max(0, maxHeight - collapsedHeight));
  }, [maxHeight, collapsedHeight, setExpandRange]);
  // Expanded and at rest the sheet is exactly the cap — the same node, so the two never
  // disagree for a frame. Going through dragOffset instead would leave it behind whenever the
  // keypad moves the cap, long enough to see the sheet overshoot and drop back.
  const minContainerHeight = isDragging
    ? Animated.add(Math.min(collapsedHeight, maxHeight), dragOffset)
    : isExpanded
      ? animatedMaxHeight
      : 0;
  return {
    container: { maxHeight: animatedMaxHeight, minHeight: minContainerHeight },
    body: { flexShrink: 1, flexGrow: 1 },
    editor: { flexShrink: 1, flexGrow: 1, minHeight: Math.min(minEditorHeight, maxHeight) },
    editorFontSize,
    onContainerLayout: (event: LayoutChangeEvent) => {
      if (!isDriven) {
        setCollapsedHeight(event.nativeEvent.layout.height);
      }
    },
  };
}
