import { h, JSX } from "preact";

interface IProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  buttonSize?: "sm" | "lg";
  kind: "green" | "red" | "blue" | "gray";
}

export function Button(props: IProps): JSX.Element {
  let className = "font-bold text-white border rounded ";
  if (props.buttonSize === "sm") {
    className += "px-2 py-1 ";
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
    <button {...props} className={`${props.className} ${className}`}>
      {props.children}
    </button>
  );
}
