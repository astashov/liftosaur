import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  style?: { [key: string]: string | number };
  color?: string;
}

export function IconBack(props: IProps): JSX.Element {
  const color = props.color || Tailwind.semantic().icon.neutral;
  return (
    <svg style={props.style} width="15" height="22" viewBox="0 0 15 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 2L3 10.9041L13 20" stroke={color} stroke-width="3" stroke-linecap="round" />
    </svg>
  );
}
