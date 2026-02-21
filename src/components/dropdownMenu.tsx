import { ComponentChildren, JSX, h } from "preact";
import { Tailwind } from "../utils/tailwindConfig";

export function DropdownMenu(props: {
  rightOffset?: string;
  leftOffset?: string;
  topOffset?: string;
  children: ComponentChildren;
  maxWidth?: string;
  bgColor?: string;
  hideTip?: boolean;
  tipClassName?: string;
  textAlign?: "left" | "right";
  onClose: () => void;
}): JSX.Element {
  const color = props.bgColor || Tailwind.semantic().background.subtle;
  const align = props.textAlign ?? "right";
  const positionStyle: Record<string, string> = {
    maxWidth: props.maxWidth || "12rem",
    top: props.topOffset ?? "0",
  };
  if (props.leftOffset != null) {
    positionStyle.left = props.leftOffset;
  } else {
    positionStyle.right = props.rightOffset ?? "2.5rem";
  }
  return (
    <section className="" style={{ zIndex: 100 }}>
      <div data-name="overlay" className="fixed inset-0 z-10 overflow-scroll scrolling-touch" onClick={props.onClose} />
      <div className={`absolute shadow rounded`} style={positionStyle}>
        <div
          className={`relative h-full z-20 rounded p-2 ${align === "left" ? "text-left" : "text-right"}`}
          style={{ backgroundColor: color }}
        >
          {props.children}
        </div>
        {!props.hideTip && <div className={props.tipClassName || "add-tip"} style={{ backgroundColor: color }} />}
      </div>
    </section>
  );
}

interface IDropdownMenuItemProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  isTop?: boolean;
}

export function DropdownMenuItem(props: IDropdownMenuItemProps): JSX.Element {
  const { className, children, isTop, ...rest } = props;
  return (
    <button
      className={`block w-full px-2 whitespace-nowrap text-base ${
        !isTop ? "pt-2 pb-1 mt-2 border-t border-border-neutral" : "py-1"
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
