import { JSX, ReactNode } from "react";
import type { NativeStackHeaderProps } from "@react-navigation/native-stack";
import { NavbarView } from "../components/navbar";
import { useAppState } from "./StateContext";
import { buildNavCommon } from "./utils";
import type { tourConfigs } from "../components/tour/tourConfigs";

export interface INavHeaderOptions {
  navTitle?: ReactNode;
  navSubtitle?: ReactNode;
  navRightButtons?: JSX.Element[];
  navOnBack?: () => boolean;
  navOnTitleClick?: () => void;
  navHelpTourId?: keyof typeof tourConfigs;
  navHelpContent?: ReactNode;
  navHidden?: boolean;
}

export function NavHeader(props: NativeStackHeaderProps): JSX.Element | null {
  const options = props.options as INavHeaderOptions;
  if (options.navHidden) {
    return null;
  }
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <NavbarView
      isStatic
      dispatch={dispatch}
      navCommon={navCommon}
      title={options.navTitle ?? ""}
      subtitle={options.navSubtitle}
      rightButtons={options.navRightButtons}
      onBack={options.navOnBack}
      onTitleClick={options.navOnTitleClick}
      helpTourId={options.navHelpTourId}
      helpContent={options.navHelpContent}
    />
  );
}
