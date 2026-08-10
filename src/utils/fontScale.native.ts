import { PixelRatio, useWindowDimensions } from "react-native";

export function useOsFontScale(): number {
  return useWindowDimensions().fontScale || 1;
}

export function OsFontScale_get(): number {
  return PixelRatio.getFontScale() || 1;
}
