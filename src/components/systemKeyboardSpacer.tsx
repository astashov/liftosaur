import { JSX, RefObject } from "react";
import { LayoutChangeEvent, Platform, ScrollView, StatusBar, TextInput, View } from "react-native";
import { useSystemKeyboardHeight } from "../utils/useSystemKeyboardHeight";

const REVEAL_MARGIN = 16;

// Android has no automaticallyAdjustKeyboardInsets, and under edge-to-edge the window doesn't
// shrink for the IME either — so without this the content can't be scrolled past the keyboard
// at all, and anything trying to reveal a focused line just hits the end of the scroll range.
// Its own component so opening the keyboard re-renders the spacer, not the whole screen.
export function SystemKeyboardSpacer(props: { scrollRef?: RefObject<ScrollView | null> }): JSX.Element {
  const height = useSystemKeyboardHeight();
  const scrollRef = props.scrollRef;
  const onLayout =
    scrollRef != null
      ? (e: LayoutChangeEvent) => {
          if (e.nativeEvent.layout.height > 0 && scrollRef.current != null) {
            revealFocusedInput(scrollRef.current);
          }
        }
      : undefined;
  return <View style={{ height }} onLayout={onLayout} />;
}

// RN's helper assumes the scroll view starts at the top of the screen, so the sheet's own window
// offset goes into the extra offset. Android's keyboard event reports the IME top in screen
// coordinates while measureInWindow is measured below the status bar (verified on API 36, both
// numbers 52dp apart), so the status bar height goes in as well.
function revealFocusedInput(scrollView: ScrollView): void {
  const input = TextInput.State.currentlyFocusedInput();
  const viewport = scrollView.getNativeScrollRef();
  if (input == null || viewport == null) {
    return;
  }
  const statusBarHeight = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;
  viewport.measureInWindow((_x, viewportY) => {
    scrollView
      .getScrollResponder()
      .scrollResponderScrollNativeHandleToKeyboard(input, viewportY + statusBarHeight + REVEAL_MARGIN, true);
  });
}
