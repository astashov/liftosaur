import { h, JSX, ComponentChildren } from "preact";

export function FooterView(props: { children?: ComponentChildren }): JSX.Element {
  return (
    <div className="relative bg-blue-700 text-white justify-center items-center p-4 text-center">
      {props.children || ""}
      <div className="absolute bottom-0 right-0 text-xs text-blue-500">{__COMMIT_HASH__}</div>
    </div>
  );
}
