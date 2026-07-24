import { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import type { INavHeaderOptions } from "./NavHeader";

export function useNavOptions(options: INavHeaderOptions): void {
  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions(options);
  });
}
