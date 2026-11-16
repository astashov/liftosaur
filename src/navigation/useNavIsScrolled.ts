import { useCallback, useRef } from "react";
import { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useNavigation } from "@react-navigation/native";

export function useNavIsScrolled(): (e: NativeSyntheticEvent<NativeScrollEvent>) => void {
  const navigation = useNavigation();
  const isScrolledRef = useRef(false);
  return useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const isScrolled = e.nativeEvent.contentOffset.y > 0;
      if (isScrolled !== isScrolledRef.current) {
        isScrolledRef.current = isScrolled;
        navigation.setOptions({ navIsScrolled: isScrolled });
      }
    },
    [navigation]
  );
}
