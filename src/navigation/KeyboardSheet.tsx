import { JSX, ReactNode } from "react";
import { Animated, useWindowDimensions, View } from "react-native";
import { SheetScreenContainer } from "./SheetScreenContainer";
import { TransparentModal } from "./TransparentModal";
import { CustomKeyboardProvider } from "./CustomKeyboardContext";
import { NavScreenScrollContext } from "./NavScreenScrollContext";
import { useNavScreenScroll } from "./useNavScreenScroll";
import { Text } from "../components/primitives/text";

interface IProps {
  children: ReactNode;
  header?: string;
  onClose: () => void;
}

// A sheet whose number fields open the custom keypad.
//
// Deliberately not a FormSheet: that rides on a native fit-to-contents sheet, which takes its
// height when it is first laid out and never grows afterwards. The keypad needs the sheet some
// 350dp taller, so on Android it ended up below the bottom of the screen — and no amount of
// reshuffling the content changes a height the sheet has stopped reading. This sheet is drawn by
// us, so its height is ordinary layout and follows the keypad like anything else.
export function KeyboardSheet(props: IProps): JSX.Element {
  const { height: windowHeight } = useWindowDimensions();
  // The ceiling belongs on the sheet, not on the scroll area: the grabber, the header and the
  // safe-area band are all part of what has to fit under it.
  const maxHeight = windowHeight * 0.85;
  // Publishing the scroll area is what lets a field focused near the bottom be scrolled clear of
  // the keypad. Left null — which is what a scroller that isn't a screen gets by default — that
  // reveal silently does nothing. Nothing overlaps the scroll area from below: the keypad is a
  // sibling that shortens it rather than covering it, so there is no footer to account for.
  const { contextValue, scrollRef, viewportRef, onScroll, onLayout, onContentSizeChange } = useNavScreenScroll({
    footerHeight: 0,
    stickyHeaderHeight: 0,
  });
  return (
    <SheetScreenContainer onClose={props.onClose} shouldShowClose={true}>
      <TransparentModal onClose={props.onClose} fitContent maxHeight={maxHeight}>
        <CustomKeyboardProvider applySafeAreaBottom={false} fitContent noShadow>
          <NavScreenScrollContext.Provider value={contextValue}>
            {props.header != null && (
              <View className="items-center py-4">
                <Text className="text-base font-semibold">{props.header}</Text>
              </View>
            )}
            {/* Alone among the sheet's children in being allowed to shrink, so this is what gives
                way once the keypad opens under a list already at the ceiling. Both the wrapper and
                the scroller shrink — either one that couldn't would pin the chain. The wrapper is
                also the box a field reveal measures itself against, which is why it spans exactly
                the scroll area and nothing else. maxHeight is for web, where the sheet above is a
                plain fragment and cannot impose one. */}
            <View ref={viewportRef} style={{ flexShrink: 1 }}>
              <Animated.ScrollView
                ref={scrollRef}
                style={{ maxHeight, flexShrink: 1 }}
                onScroll={onScroll}
                scrollEventThrottle={16}
                onLayout={onLayout}
                onContentSizeChange={onContentSizeChange}
                keyboardShouldPersistTaps="handled"
              >
                {props.children}
              </Animated.ScrollView>
            </View>
          </NavScreenScrollContext.Provider>
        </CustomKeyboardProvider>
      </TransparentModal>
    </SheetScreenContainer>
  );
}
