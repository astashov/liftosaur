import React, { JSX, ReactNode } from "react";
import { View, Pressable, Platform } from "react-native";
import { Text } from "./primitives/text";
import { IconArrowRight } from "./icons/iconArrowRight";
import { IconHandle } from "./icons/iconHandle";
import { StringUtils_dashcase } from "../utils/string";

interface IMenuItemProps {
  prefix?: ReactNode;
  name: string;
  isBorderless?: boolean;
  value?: string | JSX.Element;
  expandName?: boolean;
  expandValue?: boolean;
  addons?: ReactNode;
  shouldShowRightArrow?: boolean;
  handleTouchStart?: (e: React.MouseEvent | React.TouchEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
}

export function MenuItemWrapper(props: {
  name: string;
  children: ReactNode;
  isBorderless?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}): JSX.Element {
  const testId = `menu-item-${StringUtils_dashcase(props.name)}`;
  const inner = <View className={!props.isBorderless ? "border-b border-border-neutral" : ""}>{props.children}</View>;
  if (props.onClick) {
    return (
      <Pressable
        testID={testId}
        data-cy={testId}
        className="w-full"
        onPress={(e) => props.onClick?.(e as unknown as React.MouseEvent)}
      >
        {inner}
      </Pressable>
    );
  }
  return (
    <View testID={testId} data-cy={testId} className="w-full">
      {inner}
    </View>
  );
}

export function MenuItem(props: IMenuItemProps): JSX.Element {
  const valueNode =
    typeof props.value === "string" ? <Text className="text-right text-text-link">{props.value}</Text> : props.value;

  const dragHandle =
    props.handleTouchStart && Platform.OS === "web"
      ? React.createElement(
          "div",
          {
            className: "p-2 cursor-move",
            style: { marginLeft: "-16px", touchAction: "none" },
          },
          React.createElement(
            "span",
            {
              onMouseDown: props.handleTouchStart,
              onTouchStart: props.handleTouchStart,
            },
            React.createElement(IconHandle)
          )
        )
      : null;

  return (
    <MenuItemWrapper name={props.name} onClick={props.onClick} isBorderless={props.isBorderless}>
      <View className="flex-row items-center">
        {dragHandle}
        {props.prefix != null && <View className="flex-row items-center justify-center">{props.prefix}</View>}
        <View className={props.expandValue ? undefined : "flex-1"}>
          <View className="flex-row items-center py-3">
            <Text className="text-base text-text-primary">{props.name}</Text>
          </View>
          {props.addons != null && <View className="pb-2">{props.addons}</View>}
        </View>
        <View className={`${props.expandName ? "" : "flex-1"} items-end`}>{valueNode}</View>
        {props.shouldShowRightArrow && (
          <View className="flex-row items-center py-2 pl-2">
            <IconArrowRight />
          </View>
        )}
      </View>
    </MenuItemWrapper>
  );
}
