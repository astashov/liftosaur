import { h, JSX, ComponentChildren } from "preact";
import { IconArrowRight } from "./iconArrowRight";
import { IconHandle } from "./iconHandle";

interface IMenuItemProps {
  name: string;
  value?: string | JSX.Element;
  shouldShowRightArrow?: boolean;
  handleTouchStart?: (e: TouchEvent | MouseEvent) => void;
  onClick?: (e: MouseEvent) => void;
}

export function MenuItemWrapper(props: {
  children: ComponentChildren;
  onClick?: (e: MouseEvent) => void;
}): JSX.Element {
  return (
    <section className="w-full px-6 py-1 text-left border-b border-gray-200" onClick={props.onClick}>
      {props.children}
    </section>
  );
}

export function MenuItem(props: IMenuItemProps): JSX.Element {
  return (
    <MenuItemWrapper onClick={props.onClick}>
      <section className="flex items-center">
        {props.handleTouchStart && (
          <div className="p-2 cursor-move" style={{ marginLeft: "-16px", touchAction: "none" }}>
            <span onMouseDown={props.handleTouchStart} onTouchStart={props.handleTouchStart}>
              <IconHandle />
            </span>
          </div>
        )}
        <div className="flex items-center flex-1 py-2 text-left">{props.name}</div>
        <div className="flex-1 py-2 text-right">{props.value}</div>
        {props.shouldShowRightArrow && (
          <div className="flex items-center py-2 pl-2">
            <IconArrowRight style={{ width: "1rem", height: "1rem", fill: "#a0aec0" }} />
          </div>
        )}
      </section>
    </MenuItemWrapper>
  );
}
