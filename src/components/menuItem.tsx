import React, { JSX } from "react";
import { IconArrowRight } from "./icons/iconArrowRight";
import { IconHandle } from "./icons/iconHandle";
import { StringUtils } from "../utils/string";

interface IMenuItemProps {
  prefix?: React.ReactNode;
  name: string;
  isBorderless?: boolean;
  value?: string | JSX.Element;
  expandName?: boolean;
  expandValue?: boolean;
  addons?: React.ReactNode;
  shouldShowRightArrow?: boolean;
  handleTouchStart?: (e: TouchEvent | MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
}

export function MenuItemWrapper(props: {
  name: string;
  children: React.ReactNode;
  isBorderless?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}): JSX.Element {
  return (
    <section
      data-cy={`menu-item-${StringUtils.dashcase(props.name)}`}
      className="w-full text-base text-left"
      onClick={props.onClick}
    >
      <div className={!props.isBorderless ? "border-b border-grayv2-100" : ""}>{props.children}</div>
    </section>
  );
}

export function MenuItem(props: IMenuItemProps): JSX.Element {
  return (
    <MenuItemWrapper name={props.name} onClick={props.onClick} isBorderless={props.isBorderless}>
      <section className="flex items-center">
        {props.handleTouchStart && (
          <div className="p-2 cursor-move" style={{ marginLeft: "-16px", touchAction: "none" }}>
            <span
              onMouseDown={(e) => {
                if (props.handleTouchStart) {
                  props.handleTouchStart(e.nativeEvent);
                }
              }}
              onTouchStart={(e) => {
                if (props.handleTouchStart) {
                  props.handleTouchStart(e.nativeEvent);
                }
              }}
            >
              <IconHandle />
            </span>
          </div>
        )}
        <div className="flex items-center justify-center">{props.prefix}</div>
        <div className={`${props.expandValue ? "" : "flex-1"}`}>
          <div className="flex items-center pt-3 pb-1 text-left">{props.name}</div>
          <div className="pb-2">{props.addons}</div>
        </div>
        <div className={`${props.expandName ? "" : "flex-1"} text-right text-bluev2`}>{props.value}</div>
        {props.shouldShowRightArrow && (
          <div className="flex items-center py-2 pl-2">
            <IconArrowRight style={{ color: "#a0aec0" }} />
          </div>
        )}
      </section>
    </MenuItemWrapper>
  );
}
