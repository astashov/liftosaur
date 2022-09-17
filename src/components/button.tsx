import { h, JSX } from "preact";

interface IProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  buttonSize?: "xs" | "sm" | "lg";
  kind: "green" | "red" | "blue" | "gray" | "orange" | "purple" | "grayv2";
}

export function Button(props: IProps): JSX.Element {
  const { children, buttonSize, kind, ...otherProps } = props;
  if (kind === "purple" || kind === "orange" || kind === "grayv2") {
    let className = "text-xs text-white rounded-2xl";
    if (kind === "purple") {
      className += " bg-purplev2";
    } else if (kind === "grayv2") {
      className += " bg-grayv2-700";
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
  let className = [props.className, "font-bold text-white border rounded "].filter((l) => l).join(" ");
  if (props.buttonSize === "sm") {
    className += "px-2 py-1 ";
  } else if (props.buttonSize === "xs") {
    className += "px-1 py-0 text-xs font-normal ";
  } else {
    className += "px-4 py-2 ";
  }

  if (!props.disabled) {
    switch (props.kind) {
      case "blue":
        className += "bg-blue-500 border-blue-700 hover:bg-blue-700";
        break;
      case "red":
        className += "bg-red-500 border-red-700 hover:bg-red-700";
        break;
      case "green":
        className += "bg-green-500 border-green-700 hover:bg-green-700";
        break;
      case "gray":
        className += "bg-gray-500 border-gray-700 hover:bg-gray-700";
        break;
    }
  } else {
    className += "bg-gray-300 border-gray-500 cursor-default";
  }
  return (
    <button {...otherProps} className={`${props.className} ${className}`}>
      {children}
    </button>
  );
}
