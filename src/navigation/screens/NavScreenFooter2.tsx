import { JSX } from "react";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useAppState } from "../StateContext";
import { buildNavCommon } from "../utils";
import { Footer2View } from "../../components/footer2";
import { Screen_currentName } from "../../models/screen";

const screensWithoutFooter = ["first", "units", "setupequipment", "setupplates", "programselect", "subscription"];

export function Footer2Wrapper(_props: BottomTabBarProps): JSX.Element | null {
  const { state, dispatch } = useAppState();
  const currentScreen = Screen_currentName(state.screenStack);
  if (screensWithoutFooter.includes(currentScreen)) {
    return null;
  }
  const navCommon = buildNavCommon(state);
  return <Footer2View dispatch={dispatch} navCommon={navCommon} />;
}
