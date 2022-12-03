import { h, JSX } from "preact";

interface IProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  buttonSize?: "xs" | "sm" | "lg";
  kind: "orange" | "purple" | "grayv2";
}

export function Button(props: IProps): JSX.Element {
  const { children, buttonSize, kind, ...otherProps } = props;
  let className = "text-xs text-white rounded-2xl";
  if (kind === "purple") {
    className += " bg-purplev2-main";
  } else if (kind === "grayv2") {
    className += " bg-grayv2-main";
  } else {
    className += " bg-orangev2";
  }
  if (props.buttonSize === "sm") {
    className += " px-2 py-1 font-semibold";
  } else if (props.buttonSize === "xs") {
    className += " px-1 py-0 font-normal";
  } else {
    className += " px-8 py-3 font-semibold";
  }
  if (props.className) {
    className += ` ${props.className}`;
  }
  return (
    <button {...otherProps} className={`${props.className || ""} ${className}`}>
      {props.children}
    </button>
  );
}
