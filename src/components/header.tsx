import { h, JSX, ComponentChildren } from "preact";

interface IHeaderCenterProps {
  title: ComponentChildren;
  subtitle?: ComponentChildren;
}

interface IHeaderProps extends IHeaderCenterProps {
  left?: JSX.Element;
  right?: JSX.Element;
}

export function HeaderView(props: IHeaderProps): JSX.Element {
  return (
    <div className="HeaderView bg-blue-700 text-white justify-center items-center text-center flex">
      <div style={{ minWidth: "5rem" }} className="flex items-center justify-center">
        {props.left}
      </div>
      <HeaderCenterView {...props} />
      <div style={{ minWidth: "5rem" }} className="flex items-center justify-center">
        {props.right}
      </div>
    </div>
  );
}

export function HeaderCenterView(props: IHeaderCenterProps): JSX.Element {
  if (props.subtitle != null) {
    return (
      <div className="flex-1">
        <div className="pt-2 text-xs text-blue-300">{props.subtitle}</div>
        <div className="pb-2 text-sm">{props.title}</div>
      </div>
    );
  } else {
    return (
      <div className="flex-1 py-2">
        <div className="py-2">{props.title}</div>
      </div>
    );
  }
}
