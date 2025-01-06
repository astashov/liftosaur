import React, { JSX } from "react";
import { View, TouchableOpacity } from "react-native";
import { IconArrowRight } from "./icons/iconArrowRight";
import { IconHandle } from "./icons/iconHandle";
import { StringUtils } from "../utils/string";
import { LftText } from "./lftText";

interface IMenuItemProps {
  prefix?: React.ReactNode;
  name: string;
  isBorderless?: boolean;
  value?: string | JSX.Element;
  expandName?: boolean;
  expandValue?: boolean;
  addons?: React.ReactNode;
  shouldShowRightArrow?: boolean;
  handleTouchStart?: () => void;
  onClick?: () => void;
}

export function MenuItemWrapper(props: {
  name: string;
  children: React.ReactNode;
  isBorderless?: boolean;
  onClick?: () => void;
}): JSX.Element {
  const view = <View className={!props.isBorderless ? "border-b border-grayv2-100" : ""}>{props.children}</View>;
  if (props.onClick) {
    return (
      <TouchableOpacity
        data-cy={`menu-item-${StringUtils.dashcase(props.name)}`}
        className="w-full text-base text-left"
        onPress={() => {
          if (props.onClick) {
            props.onClick();
          }
        }}
      >
        {view}
      </TouchableOpacity>
    );
  } else {
    return view;
  }
}

export function MenuItem(props: IMenuItemProps): JSX.Element {
  return (
    <MenuItemWrapper name={props.name} onClick={props.onClick} isBorderless={props.isBorderless}>
      <View className="flex flex-row items-center">
        {props.handleTouchStart && (
          <View className="p-2 cursor-move" style={{ marginLeft: -16 }}>
            <TouchableOpacity
              onPressIn={(e) => {
                if (props.handleTouchStart) {
                  props.handleTouchStart();
                }
              }}
            >
              <IconHandle />
            </TouchableOpacity>
          </View>
        )}
        <View className="flex flex-row items-center justify-center">{props.prefix}</View>
        <View className={`${props.expandValue ? "" : "flex-1"}`}>
          <LftText className="flex flex-row items-center pt-3 pb-1 text-left">{props.name}</LftText>
          <View className="pb-2">{props.addons}</View>
        </View>
        <LftText className={`${props.expandName ? "" : "flex-1"} text-right text-bluev2`}>{props.value}</LftText>
        {props.shouldShowRightArrow && (
          <View className="flex flex-row items-center py-2 pl-2">
            <IconArrowRight style={{ color: "#a0aec0" }} />
          </View>
        )}
      </View>
    </MenuItemWrapper>
  );
}
