import { JSX, ReactNode } from "react";
import { View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  navIsScrolled?: boolean;
}

interface IHeaderProps {
  options: object;
  back?: { title: string | undefined } | undefined;
}

export function NavHeader(props: IHeaderProps): JSX.Element | null {
  const options = props.options as INavHeaderOptions;
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  const insets = useSafeAreaInsets();
  if (options.navHidden) {
    return null;
  }
  const shadowStyle = options.navIsScrolled
    ? Platform.select({
        ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
        android: { elevation: 4 },
        default: { boxShadow: "0 4px 4px -2px rgba(0,0,0,0.08)" },
      })
    : undefined;
  return (
    <View className="bg-background-default" style={[{ paddingTop: insets.top }, shadowStyle]}>
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
    </View>
  );
}
