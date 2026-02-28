import { h, JSX } from "preact";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  style?: { [key: string]: string | number };
  size?: number;
  className?: string;
  color?: string;
}

export function IconPlay(props: IProps): JSX.Element {
  const color = props.color || Tailwind_semantic().icon.neutral;
  const width = props.size || 19;
  const height = props.size || 19;
  return (
    <svg
      style={props.style}
      className={`inline-block ${props.className}`}
      width={width}
      height={height}
      viewBox="0 0 19 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="9.81024" cy="9.79712" r="8" stroke={color} stroke-width="2" />
      <path
        d="M14.3102 8.93109C14.9769 9.31599 14.9769 10.2782 14.3102 10.6631L8.31024 14.1272C7.64357 14.5121 6.81024 14.031 6.81024 13.2612L6.81024 6.33302C6.81024 5.56322 7.64358 5.08209 8.31024 5.46699L14.3102 8.93109Z"
        fill={color}
      />
    </svg>
  );
}
