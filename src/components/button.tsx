import { h, JSX } from "preact";

interface IProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  buttonSize?: "xs" | "sm" | "md" | "lg" | "lg2";
  kind: "orange" | "purple" | "grayv2" | "red" | "transparent-purple" | "lightpurple" | "lightgrayv3";
  name: string;
}

export function Button(props: IProps): JSX.Element {
  const { children, buttonSize, kind, ...otherProps } = props;
  const hasTextSize =
    props.className &&
    (props.className.includes("text-xs") ||
      props.className.includes("text-sm") ||
      props.className.includes("text-lg") ||
      props.className.includes("text-base"));
  let className = `${!hasTextSize ? "text-xs " : ""}rounded-lg`;
  if (props.disabled) {
    className += " bg-background-darkgray opacity-50 text-text-alwayswhite ";
  } else if (kind === "purple") {
    className += " bg-button-primarybackground text-text-alwayswhite ";
  } else if (kind === "grayv2") {
    className += " bg-background-darkgray text-text-alwayswhite ";
  } else if (kind === "red") {
    className += " bg-background-darkred text-text-alwayswhite ";
  } else if (kind === "transparent-purple") {
    className += " bg-transparent text-text-purple ";
  } else if (kind === "lightpurple") {
    className += " bg-background-purpledark text-text-link ";
  } else if (kind === "lightgrayv3") {
    className += " bg-background-subtle text-text-link border border-background-subtle ";
  } else {
    className += " bg-button-orangebackground text-text-alwayswhite";
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
