import { JSX, ReactNode, useCallback, useRef } from "react";
import { ScrollView, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { useNavigation } from "@react-navigation/native";

export function NavScreenContent(props: { children: ReactNode }): JSX.Element {
  const navigation = useNavigation();
  const isScrolledRef = useRef(false);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const isScrolled = e.nativeEvent.contentOffset.y > 0;
      if (isScrolled !== isScrolledRef.current) {
        isScrolledRef.current = isScrolled;
        navigation.setOptions({ navIsScrolled: isScrolled });
      }
    },
    [navigation]
  );

  return (
    <ScrollView
      data-cy="screen"
      testID="screen"
      contentContainerStyle={{ flexGrow: 1 }}
      style={{ flex: 1 }}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {props.children}
    </ScrollView>
  );
}
