import React, { JSX } from "react";
import { Thunk } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { IScreen } from "../models/screen";
import { IconBack } from "./icons/iconBack";
import { IconHelp } from "./icons/iconHelp";
import { useEffect, useRef, useState } from "react";
import { ILoading, IState, updateState } from "../models/state";
import { IconSpinner } from "./icons/iconSpinner";
import { IconClose } from "./icons/iconClose";
import { lb } from "lens-shmens";
import { Modal } from "./modal";
import { ObjectUtils } from "../utils/object";
import { ModalDebug } from "./modalDebug";
import { View, TouchableOpacity } from "react-native";
import { Link } from "./link";
import { LftText } from "./lftText";

interface INavbarCenterProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onTitleClick?: () => void;
}

interface INavbarProps extends INavbarCenterProps {
  dispatch: IDispatch;
  rightButtons?: JSX.Element[];
  onBack?: () => boolean;
  helpContent?: React.ReactNode;
  loading: ILoading;
  screenStack: IScreen[];
}

export const NavbarView = (props: INavbarProps): JSX.Element => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showDebug, setShowDebug] = useState(0);
  const timerRef = useRef<number | undefined>(undefined);
  const showBackButton = props.screenStack.length > 1;

  useEffect(() => {
    if (typeof window !== "undefined" && window.addEventListener) {
      const onScroll = (): void => {
        if (window.pageYOffset > 0 && !isScrolled) {
          setIsScrolled(true);
        } else if (window.pageYOffset === 0 && isScrolled) {
          setIsScrolled(false);
        }
      };
      window.addEventListener("scroll", onScroll);
      return () => {
        window.removeEventListener("scroll", onScroll);
      };
    }
    return;
  });

  let className =
    "fixed top-0 left-0 z-30 flex flex-row items-center justify-center w-full px-2 text-center bg-white safe-area-inset-top";
  if (isScrolled) {
    className += " has-shadow";
  }

  const loadingItems = props.loading.items;
  const loadingKeys = Object.keys(loadingItems).filter((k) => loadingItems[k]?.endTime == null);
  const errors = ObjectUtils.filter(props.loading.items, (k, v) => v?.error != null);
  const error = ObjectUtils.values(errors)[0]?.error;

  const isLoading = Object.keys(loadingKeys).length > 0;
  const numberOfLeftButtons = [showBackButton ? 1 : 0, isLoading ? 1 : 0].reduce((a, b) => a + b);
  const numberOfRightButtons = (props.rightButtons?.length ?? 0) + (props.helpContent ? 1 : 0);
  const numberOfButtons = Math.max(numberOfLeftButtons, numberOfRightButtons);
  const [shouldShowModalHelp, setShouldShowModalHelp] = useState(false);

  return (
    <>
      <View data-cy="navbar" className={className}>
        <View className="flex flex-row items-center justify-start" style={{ minWidth: numberOfButtons * 40 }}>
          {showBackButton ? (
            <TouchableOpacity
              className="p-2 nm-back"
              data-cy="navbar-back"
              onPress={() => {
                if (!props.onBack || props.onBack()) {
                  props.dispatch(Thunk.pullScreen());
                }
              }}
            >
              <IconBack />
            </TouchableOpacity>
          ) : undefined}
          {isLoading ? (
            <View className="pl-2">
              <IconSpinner width={20} height={20} />
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
              setShowDebug(showDebug + 1);
              timerRef.current = window.setTimeout(() => {
                if (showDebug <= 3) {
                  setShowDebug(0);
                }
              }, 1000);
            })
          }
        />
        <View className="flex flex-row items-center justify-end" style={{ minWidth: numberOfButtons * 40 }}>
          {props.rightButtons}
          {props.helpContent && (
            <TouchableOpacity className="p-2 nm-navbar-help" onPress={() => setShouldShowModalHelp(true)}>
              <IconHelp />
            </TouchableOpacity>
          )}
        </View>
        {error && (
          <View className="absolute left-0 flex flex-row justify-center w-full align-middle" style={{ bottom: -16 }}>
            <View
              className="flex flex-row items-center pl-4 rounded-full pointer-events-auto border-redv2-main text-redv2-main"
              style={{ backgroundColor: "#FFECEC", boxShadow: "0 0 4px rgba(255, 27, 27, 0.38)" }}
            >
              <LftText className="font-bold" style={{ paddingTop: 1 }}>
                {error}
              </LftText>
              <TouchableOpacity
                className="px-3 nm-navbar-error-close"
                onPress={() =>
                  updateState(props.dispatch, [
                    lb<IState>()
                      .p("loading")
                      .recordModify((l) => {
                        return { ...l, items: ObjectUtils.filter(l.items, (k, v) => v?.error == null) };
                      }),
                  ])
                }
              >
                <IconClose size={16} color="#E53E3E" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      {props.helpContent && shouldShowModalHelp && (
        <Modal
          isHidden={!shouldShowModalHelp}
          onClose={() => setShouldShowModalHelp(false)}
          shouldShowClose={true}
          isFullWidth
        >
          {props.helpContent}
          <View className="w-full h-0 mt-4 mb-2 border-b border-grayv2-200" />
          <LftText className="text-sm text-grayv2-main">
            If you still have questions, or if you encountered a bug, have a feature idea, or just want to share some
            feedback - don't hesitate to <Link href="mailto:info@liftosaur.com">contact us</Link>! Or join our{" "}
            <Link href="https://discord.com/invite/AAh3cvdBRs">Discord server</Link> and ask your question there.
          </LftText>
        </Modal>
      )}
      {showDebug > 4 && (
        <ModalDebug onClose={() => setShowDebug(0)} loading={props.loading} dispatch={props.dispatch} />
      )}
    </>
  );
};

export function NavbarCenterView(props: INavbarCenterProps): JSX.Element {
  if (props.subtitle != null) {
    return (
      <View className="flex-1">
        <TouchableOpacity onPress={props.onTitleClick}>
          <View className="pt-2">
            {typeof props.title === "string" ? (
              <LftText className="text-sm font-semibold text-center ">{props.title}</LftText>
            ) : (
              props.title
            )}
          </View>
          <View className="pb-2">
            {typeof props.subtitle === "string" ? (
              <LftText className="text-sm font-semibold text-center text-orangev2">{props.subtitle}</LftText>
            ) : (
              props.subtitle
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  } else {
    return (
      <View className="flex-1 py-2">
        <TouchableOpacity onPress={props.onTitleClick}>
          <LftText className="py-2 text-lg font-semibold text-center whitespace-no-wrap">{props.title}</LftText>
        </TouchableOpacity>
      </View>
    );
  }
}
