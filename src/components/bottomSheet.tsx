import React, { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { View, TouchableOpacity } from "react-native";

interface IProps {
  isHidden: boolean;
  children?: React.ReactNode;
  onClose: () => void;
}

export function BottomSheet(props: IProps): JSX.Element {
  const [bottomShift, setBottomShift] = useState(-99999);
  const bottomSheetRef = useRef<View>(null);

  useEffect(() => {
    setBottomShift(props.isHidden ? bottomShift : 0);
  }, [props.isHidden]);

  return (
    <View
      className={`fixed inset-0 z-30 ${props.isHidden ? "invisible " : ""}`}
      onLayout={(event) => {
        const { height } = event.nativeEvent.layout;
        setBottomShift(-height);
      }}
    >
      <TouchableOpacity
        data-name="overlay"
        className={`absolute inset-0 bg-grayv2-700 ${props.isHidden ? "opacity-0" : "opacity-50"}`}
        onPress={props.onClose}
      ></TouchableOpacity>
      <View
        ref={bottomSheetRef}
        className={`absolute left-0 bottom-0 flex flex-row w-full bg-white`}
        style={{
          transform: [{ translateY: bottomShift }],
          borderRadius: "16px 16px 0 0",
          boxShadow: "0 -5px 15px rgb(0 0 0 / 30%)",
        }}
      >
        <View className="w-full safe-area-inset-bottom">{props.children}</View>
      </View>
    </View>
  );
}
