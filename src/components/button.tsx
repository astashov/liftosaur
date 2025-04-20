import { h, JSX } from "preact";

interface IProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  buttonSize?: "xs" | "sm" | "md" | "lg" | "lg2";
  kind: "orange" | "purple" | "grayv2" | "red" | "transparent-purple";
  name: string;
}

export function Button(props: IProps): JSX.Element {
  const { children, buttonSize, kind, ...otherProps } = props;
  let className = "text-xs rounded-lg";
  if (props.disabled) {
    className += " bg-grayv2-main opacity-50 text-white ";
  } else if (kind === "purple") {
    className += " bg-purplev3-500 text-white ";
  } else if (kind === "grayv2") {
    className += " bg-grayv2-main text-white ";
  } else if (kind === "red") {
    className += " bg-redv2-main text-white ";
  } else if (kind === "transparent-purple") {
    className += " bg-transparent text-purplev3-600 ";
  } else {
    className += " bg-orangev2 text-white";
  }
  if (props.buttonSize === "sm") {
    className += " px-2 py-1 font-semibold";
  } else if (props.buttonSize === "xs") {
    className += " px-1 py-0 font-normal";
  } else if (props.buttonSize === "md") {
    className += " px-4 py-2 font-semibold";
  } else if (props.buttonSize === "lg2") {
    className += " px-2 py-3 font-semibold";
  } else {
    className += " px-8 py-3 font-semibold";
  }
  if (props.className) {
    className += ` ${props.className}`;
  }
  if (props.disabled) {
    className += " cursor-not-allowed";
  }
  return (
    <button {...otherProps} className={`${props.className || ""} ${className} nm-${props.name}`}>
      {props.children}
    </button>
  );
}
