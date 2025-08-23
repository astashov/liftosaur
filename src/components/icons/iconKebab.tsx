import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  style?: { [key: string]: string | number };
  className?: string;
  color?: string;
}

export function IconKebab(props: IProps): JSX.Element {
  const color = props.color || Tailwind.semantic().icon.neutral;
  return (
    <svg
      style={props.style}
      className={props.className}
      width="16"
      height="4"
      viewBox="0 0 16 4"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="8" cy="2" r="2" fill={color} />
      <circle cx="2" cy="2" r="2" fill={color} />
      <circle cx="14" cy="2" r="2" fill={color} />
    </svg>
  );
}
