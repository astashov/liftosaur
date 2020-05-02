import { h, JSX } from "preact";

interface IProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  kind: "green" | "red" | "blue" | "gray";
}

export function Button(props: IProps): JSX.Element {
  let className: string;
  switch (props.kind) {
    case "blue":
      className = "px-4 py-2 font-bold text-white bg-blue-500 border border-blue-700 rounded hover:bg-blue-700";
      break;
    case "red":
      className = "px-4 py-2 font-bold text-white bg-red-500 border border-red-700 rounded hover:bg-red-700";
      break;
    case "green":
      className = "px-4 py-2 font-bold text-white bg-green-500 border border-green-700 rounded hover:bg-green-700";
      break;
    case "gray":
      className = "px-4 py-2 font-bold text-white bg-gray-500 border border-gray-700 rounded hover:bg-gray-700";
      break;
  }
  return (
    <button {...props} className={`${props.className} ${className}`}>
      {props.children}
    </button>
  );
}
