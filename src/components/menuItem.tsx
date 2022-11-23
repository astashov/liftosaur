import { h, JSX, ComponentChildren } from "preact";
import { IconArrowRight } from "./icons/iconArrowRight";
import { IconHandle } from "./icons/iconHandle";
import { StringUtils } from "../utils/string";

interface IMenuItemProps {
  prefix?: ComponentChildren;
  name: string;
  value?: string | JSX.Element;
  addons?: ComponentChildren;
  shouldShowRightArrow?: boolean;
  handleTouchStart?: (e: TouchEvent | MouseEvent) => void;
  onClick?: (e: MouseEvent) => void;
}

export function MenuItemWrapper(props: {
  name: string;
  children: ComponentChildren;
  onClick?: (e: MouseEvent) => void;
}): JSX.Element {
  return (
    <section
      data-cy={`menu-item-${StringUtils.dashcase(props.name)}`}
      className="w-full text-base text-left"
      onClick={props.onClick}
    >
      <div className="border-b border-grayv2-100">{props.children}</div>
    </section>
  );
}

export function MenuItem(props: IMenuItemProps): JSX.Element {
  return (
    <MenuItemWrapper name={props.name} onClick={props.onClick}>
      <section className="flex items-center">
        {props.handleTouchStart && (
          <div className="p-2 cursor-move" style={{ marginLeft: "-16px", touchAction: "none" }}>
            <span onMouseDown={props.handleTouchStart} onTouchStart={props.handleTouchStart}>
              <IconHandle />
            </span>
          </div>
        )}
        <div className="flex items-center justify-center">{props.prefix}</div>
        <div className="flex-1">
          <div className="flex items-center pt-3 pb-1 text-left">{props.name}</div>
          <div className="pb-3">{props.addons}</div>
        </div>
        <div className="flex-1 text-right text-bluev2">{props.value}</div>
        {props.shouldShowRightArrow && (
          <div className="flex items-center py-2 pl-2">
            <IconArrowRight style={{ color: "#a0aec0" }} />
          </div>
        )}
      </section>
    </MenuItemWrapper>
  );
}
