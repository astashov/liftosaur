import { JSX, ReactNode } from "react";
import type { StackHeaderProps } from "@react-navigation/stack";
import { NavbarView } from "../components/navbar";
import { useAppState } from "./StateContext";
import { buildNavCommon } from "./utils";
import type { ITourId } from "../models/state";

export interface INavHeaderOptions {
  navTitle?: ReactNode;
  navSubtitle?: ReactNode;
  navRightButtons?: JSX.Element[];
  navOnBack?: () => boolean;
  navOnTitleClick?: () => void;
  navHelpTourId?: ITourId;
  navHelpContent?: ReactNode;
  navHidden?: boolean;
}

export function NavHeader(props: StackHeaderProps): JSX.Element | null {
  const options = props.options as INavHeaderOptions;
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  if (options.navHidden) {
    return null;
  }
  return (
    <NavbarView
      isStatic
      showBack={!!props.back}
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
