import { h, JSX, ComponentChildren } from "preact";
import { IconArrowRight } from "./iconArrowRight";

interface IMenuItemProps {
  name: string;
  value?: string;
  shouldShowRightArrow?: boolean;
  onClick?: () => void;
}

export function MenuItemWrapper(props: { children: ComponentChildren; onClick?: () => void }): JSX.Element {
  return (
    <section className="w-full px-6 py-1 text-left border-b border-gray-200" onClick={props.onClick}>
      {props.children}
    </section>
  );
}

export function MenuItem(props: IMenuItemProps): JSX.Element {
  return (
    <MenuItemWrapper onClick={props.onClick}>
      <section className="flex">
        <div className="flex-1 py-2 text-left">{props.name}</div>
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
