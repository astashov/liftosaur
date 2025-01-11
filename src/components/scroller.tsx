import React, { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { LftText } from "./lftText";

interface IProps {
  children: React.ReactNode;
  arrowYOffsetPct?: number;
}

export function Scroller(props: IProps): JSX.Element {
  const [atLeft, setAtLeft] = useState<boolean>(true);
  const [atRight, setAtRight] = useState<boolean>(false);
  const tabsRef = useRef<ScrollView>(null);

  // useEffect(() => {
  //   if (!tabsRef.current || tabsRef.current!.clientWidth >= tabsRef.current!.scrollWidth) {
  //     setAtLeft(true);
  //     setAtRight(true);
  //   } else {
  //     setAtLeft(tabsRef.current!.scrollLeft === 0);
  //     const diff = Math.abs(
  //       tabsRef.current!.scrollLeft - (tabsRef.current!.scrollWidth - tabsRef.current!.clientWidth)
  //     );
  //     setAtRight(diff < 3);
  //   }
  // }, []);

  return (
    <View className="relative flex-1 min-w-0">
      {!atLeft && (
        <TouchableOpacity
          className="absolute left-0 z-20 flex-row items-center justify-center w-8 h-8 px-4 ml-auto bg-white rounded-full outline-none focus:outline-none nm-scroller-left"
          style={{
            boxShadow: "0 0 1px 2px rgba(0,0,0,0.05)",
            top: "50%",
            transform: [{ translateY: -50 + (props.arrowYOffsetPct || 0) }],
          }}
          onPress={() => {
            tabsRef.current!.scrollTo({ x: 0, animated: true });
          }}
        >
          <LftText>{"<"}</LftText>
        </TouchableOpacity>
      )}
      {!atRight && (
        <TouchableOpacity
          className="absolute right-0 z-20 flex-row items-center justify-center w-8 h-8 px-4 ml-auto bg-white rounded-full outline-none focus:outline-none nm-scroller-right"
          style={{
            boxShadow: "0 0 1px 2px rgba(0,0,0,0.05)",
            top: "50%",
            transform: [{ translateY: -50 + (props.arrowYOffsetPct || 0) }],
          }}
          onPress={() => {
            tabsRef.current!.scrollTo({ x: 10000, animated: true });
          }}
        >
          <LftText>{">"}</LftText>
        </TouchableOpacity>
      )}

      <ScrollView
        className="overflow-x-auto"
        ref={tabsRef}
        horizontal
        onScroll={(e) => {
          const scrollLeft = e.nativeEvent.contentOffset.x;
          const scrollWidth = e.nativeEvent.contentSize.width;
          const clientWidth = e.nativeEvent.layoutMeasurement.width;
          setAtLeft(scrollLeft === 0);
          const diff = Math.abs(scrollLeft - (scrollWidth - clientWidth));
          setAtRight(diff < 3);
        }}
      >
        {props.children}
      </ScrollView>
    </View>
  );
}
