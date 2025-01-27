import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  color?: string;
  style?: { [key: string]: string | number };
  size?: number;
  className?: string;
}

export function IconGraphs(props: IProps): JSX.Element {
  const size = props.size ?? 20;
  const color = props.color || Tailwind.colors().blackv2;
  return (
    <svg
      width={size}
      height={size}
      stroke={color}
      style={props.style}
      className={`inline-block ${props.className}`}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M1 1V19H19" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path
        d="M4.16663 16.1667L9.62117 10.4067L12.8598 13.8267L19.1666 7.16675"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M4.16663 10.1667L9.62117 4.40675L12.8598 7.82675L19.1666 1.16675"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
