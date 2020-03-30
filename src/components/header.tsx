import { h, JSX, ComponentChildren } from "preact";

export function HeaderView(props: { children: ComponentChildren }): JSX.Element {
  return <div className="bg-blue-700 text-white justify-center items-center p-4 text-center">{props.children}</div>;
}
