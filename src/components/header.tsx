import { h, JSX, ComponentChildren } from "preact";

interface IHeaderProps {
  title: ComponentChildren;
  subtitle?: ComponentChildren;
  left?: JSX.Element;
  right?: JSX.Element;
}

export function HeaderView(props: IHeaderProps): JSX.Element {
  if (props.subtitle == null) {
    return (
      <div className="HeaderView bg-blue-700 text-white justify-center items-center p-4 text-center">{props.title}</div>
    );
  } else {
    return (
      <div className="HeaderView bg-blue-700 text-white justify-center items-center text-center flex">
        <div style={{ minWidth: "5rem" }} className="flex items-center justify-center">
          {props.left}
        </div>
        <div className="flex-1">
          <div className="pt-2 text-xs text-blue-300">{props.subtitle}</div>
          <div className="pb-2 text-sm">{props.title}</div>
        </div>
        <div style={{ minWidth: "5rem" }} className="flex items-center justify-center">
          {props.right}
        </div>
      </div>
    );
  }
}
