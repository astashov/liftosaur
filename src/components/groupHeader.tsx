import { h, JSX } from "preact";

export function GroupHeader(props: { name: string }): JSX.Element {
  return <div className="px-6 py-1 text-sm font-bold bg-gray-200">{props.name}</div>;
}
