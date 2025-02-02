import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  style?: { [key: string]: string | number };
  className?: string;
  size?: number;
  color?: string;
}

export function IconArrowDown3(props: IProps): JSX.Element {
  const size = props.size || 18;
  const color = props.color || Tailwind.colors().purplev3[500];
  return (
    <svg
      style={props.style}
      className={props.className}
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 10.3333L9 17M9 17L2 10.3333M9 17L9 1"
        stroke={color}
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
