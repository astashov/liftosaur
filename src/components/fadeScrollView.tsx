import { JSX, ReactNode, RefObject, useId } from "react";
import { ScrollView, View } from "react-native";
import { Svg, Defs, LinearGradient, Stop, Rect } from "./primitives/svg";
import { Tailwind_semantic } from "../utils/tailwindConfig";

interface IProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  // Must match the background the scroller sits on for the overlay to read as a fade.
  color?: string;
  fadeWidth?: number;
  scrollRef?: RefObject<ScrollView | null>;
}

// Horizontal scroller whose right edge fades content out into the background. The gradient
// is background-colored, so it stays invisible until content actually scrolls under it —
// no scroll-position tracking needed.
export function FadeScrollView(props: IProps): JSX.Element {
  // useId can contain colons, which break url(#...) references on web.
  const gradientId = `fade-scroll-${useId().replace(/:/g, "")}`;
  const color = props.color ?? Tailwind_semantic().background.default;
  const fadeWidth = props.fadeWidth ?? 24;
  return (
    <View className={`relative ${props.className ?? ""}`}>
      {/* The automatic inset under the native-stack modal gives the scroller vertical
          scrollable range, which reads as a rubbery vertical drag on the chip rails. */}
      <ScrollView
        ref={props.scrollRef}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        alwaysBounceVertical={false}
        contentInsetAdjustmentBehavior="never"
      >
        <View className={`flex-row items-center ${props.contentClassName ?? ""}`} style={{ paddingRight: fadeWidth }}>
          {props.children}
        </View>
      </ScrollView>
      <View pointerEvents="none" style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: fadeWidth }}>
        <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={color} stopOpacity={0} />
              <Stop offset="100%" stopColor={color} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill={`url(#${gradientId})`} />
        </Svg>
      </View>
    </View>
  );
}
