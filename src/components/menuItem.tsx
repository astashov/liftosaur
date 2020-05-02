import { h, JSX, ComponentChildren } from "preact";

interface IMenuItemProps {
  name: string;
  value?: string;
  onClick?: () => void;
}

export function MenuItemWrapper(props: { children: ComponentChildren; onClick?: () => void }): JSX.Element {
  return (
    <section className="flex w-full px-6 py-1 text-left border-b border-gray-200" onClick={props.onClick}>
      {props.children}
    </section>
  );
}

export function MenuItem(props: IMenuItemProps): JSX.Element {
  return (
    <MenuItemWrapper onClick={props.onClick}>
      <div className="flex-1 py-2 text-left">{props.name}</div>
      <div className="flex-1 py-2 text-right">{props.value}</div>
    </MenuItemWrapper>
  );
}
