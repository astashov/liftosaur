import { useEffect, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import type { INavHeaderOptions } from "./NavHeader";
import { NavOptionsChanged_isChanged } from "./navOptionsChanged";

export function useNavOptions(options: INavHeaderOptions): void {
  const navigation = useNavigation();
  const prevRef = useRef<INavHeaderOptions | undefined>(undefined);
  useEffect(() => {
    if (!NavOptionsChanged_isChanged(prevRef.current, options)) {
      return;
    }
    prevRef.current = options;
    navigation.setOptions(options);
  });
}
