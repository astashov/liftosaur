import { h, JSX } from "preact";

interface IProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  kind: "green" | "red" | "blue" | "gray";
}

export function Button(props: IProps): JSX.Element {
  let className: string;
  switch (props.kind) {
    case "blue":
      className = "bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 border border-green-700 rounded";
      break;
    case "red":
      className = "bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 border border-red-700 rounded";
      break;
    case "green":
      className = "bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 border border-green-700 rounded";
      break;
    case "gray":
      className = "bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 border border-gray-700 rounded";
      break;
  }
  return (
    <button className={className} {...props}>
      {props.children}
    </button>
  );
}
