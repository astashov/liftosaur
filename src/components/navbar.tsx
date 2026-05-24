import { JSX, ReactNode, useRef, useState } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { Thunk_pullScreen } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { IconBack } from "./icons/iconBack";
import { IconHelp } from "./icons/iconHelp";
import { INavCommon, IState, updateState } from "../models/state";
import { IconSpinner } from "./icons/iconSpinner";
import { IconClose } from "./icons/iconClose";
import { lb } from "lens-shmens";
import { ObjectUtils_filter, ObjectUtils_values } from "../utils/object";
import { navigateToModal } from "../navigation/navigationService";
import { Tailwind_semantic, Tailwind_colors } from "../utils/tailwindConfig";
import { ITourId } from "../models/state";
import type { IHelpKey } from "./help/helpRegistry";

interface INavbarCenterProps {
  title: ReactNode;
  subtitle?: ReactNode;
  onTitleClick?: () => void;
}

interface INavbarProps extends INavbarCenterProps {
  dispatch: IDispatch;
  rightButtons?: JSX.Element[];
  onBack?: () => boolean;
  navCommon: INavCommon;
  helpTourId?: ITourId;
  helpKey?: IHelpKey;
  isStatic?: boolean;
  showBack?: boolean;
}

export const NavbarView = (props: INavbarProps): JSX.Element => {
  const [showDebug, setShowDebug] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { loading } = props.navCommon;
  const showBackButton = props.showBack ?? false;

  const loadingItems = loading.items;
  const loadingKeys = Object.keys(loadingItems).filter((k) => loadingItems[k]?.endTime == null);
  const errors = ObjectUtils_filter(loading.items, (k, v) => v?.error != null);
  const error = ObjectUtils_values(errors)[0]?.error;

  const isLoading = Object.keys(loadingKeys).length > 0;
  const numberOfLeftButtons = (showBackButton ? 1 : 0) + (isLoading ? 1 : 0);
  const numberOfRightButtons = (props.rightButtons?.length ?? 0) + (props.helpKey || props.helpTourId ? 1 : 0);
  const numberOfButtons = Math.max(numberOfLeftButtons, numberOfRightButtons);

  return (
    <>
      <View testID="navbar" className="z-30 w-full flex-row items-center justify-center px-2 bg-background-default">
        <View className="flex-row items-center justify-start" style={{ minWidth: numberOfButtons * 40 }}>
          {showBackButton ? (
            <Pressable
              testID="navbar-back"
              className="p-2"
              onPress={() => {
                if (!props.onBack || props.onBack()) {
                  props.dispatch(Thunk_pullScreen());
                }
              }}
            >
              <IconBack color={Tailwind_semantic().icon.neutral} />
            </Pressable>
          ) : null}
          {isLoading ? (
            <View className="pl-2">
              <IconSpinner width={20} height={20} color={Tailwind_semantic().icon.neutral} />
            </View>
          ) : null}
        </View>
        <NavbarCenterView
          {...props}
          onTitleClick={
            props.onTitleClick ||
            (() => {
              if (timerRef.current != null) {
                clearTimeout(timerRef.current);
                timerRef.current = undefined;
              }
              const newCount = showDebug + 1;
              setShowDebug(newCount);
              if (newCount > 4) {
                setShowDebug(0);
                navigateToModal("debugModal");
              }
              timerRef.current = setTimeout(() => {
                if (newCount <= 3) {
                  setShowDebug(0);
                }
              }, 1000);
            })
          }
        />
        <View className="flex-row items-center justify-end" style={{ minWidth: numberOfButtons * 40 }}>
          {props.rightButtons}
          {(props.helpTourId || props.helpKey) && (
            <Pressable
              className="p-2"
              onPress={() => {
                if (props.helpTourId) {
                  updateState(
                    props.dispatch,
                    [lb<IState>().p("tour").record({ id: props.helpTourId, enforced: true })],
                    "Start tour from navbar"
                  );
                } else if (props.helpKey) {
                  navigateToModal("helpModal", { helpKey: props.helpKey });
                }
              }}
            >
              <IconHelp color={Tailwind_semantic().icon.neutral} />
            </Pressable>
          )}
        </View>
        {error && (
          <View
            className="absolute left-0 flex-row justify-center w-full"
            style={{ bottom: -16 }}
            pointerEvents="box-none"
          >
            <View className="flex-row items-center pl-4 rounded-full bg-background-error border-text-error">
              <Text className="text-sm font-bold text-text-alwayswhite">{error}</Text>
              <Pressable
                className="px-3"
                onPress={() =>
                  updateState(
                    props.dispatch,
                    [
                      lb<IState>()
                        .p("loading")
                        .recordModify((l) => {
                          return { ...l, items: ObjectUtils_filter(l.items, (k, v) => v?.error == null) };
                        }),
                    ],
                    "Clear error messages"
                  )
                }
              >
                <IconClose size={16} color={Tailwind_colors().white} />
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </>
  );
};

export function NavbarCenterView(props: INavbarCenterProps): JSX.Element {
  if (props.subtitle != null) {
    return (
      <Pressable className="flex-1 items-center" onPress={props.onTitleClick}>
        <Text className="pt-2 text-sm font-semibold text-center text-text-primary">{props.title}</Text>
        <View className="pb-2">
          {typeof props.subtitle === "string" ? (
            <Text className="text-sm font-semibold text-center text-icon-yellow">{props.subtitle}</Text>
          ) : (
            props.subtitle
          )}
        </View>
      </Pressable>
    );
  } else {
    return (
      <Pressable className="flex-1 py-2" onPress={props.onTitleClick}>
        <Text className="py-2 text-lg font-semibold text-center text-text-primary">{props.title}</Text>
      </Pressable>
    );
  }
}
