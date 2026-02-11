import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconLove(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind.semantic().icon.neutral;
  return (
    <svg
      width={size}
      height={size}
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9.97851 5.02841L11.6489 6.69881C11.8428 6.89271 12.1572 6.89271 12.3511 6.6988L14.0215 5.02841C15.4419 3.60799 17.6119 3.25585 19.4086 4.1542C20.3118 4.60579 21.0441 5.33813 21.4957 6.24131L21.72 6.68983C22.5318 8.31348 22.5876 10.2122 21.8725 11.8807L21.8242 11.9935C20.4457 15.2099 18.0563 17.8891 15.0181 19.6253L13.958 20.231C12.7447 20.9243 11.2553 20.9243 10.042 20.231L8.9819 19.6253C5.94368 17.8891 3.55427 15.2099 2.17584 11.9935L2.12749 11.8807C1.41241 10.2122 1.46821 8.31348 2.28004 6.68983L2.5043 6.2413C2.95589 5.33813 3.68823 4.60579 4.5914 4.1542C6.38811 3.25585 8.55809 3.60799 9.97851 5.02841Z"
        stroke={color}
        stroke-width="2.5"
        stroke-linejoin="round"
      />
    </svg>
  );
}
