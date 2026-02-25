import { h, JSX } from "preact";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconTimerSmall(props: IProps): JSX.Element {
  const size = props.size ?? 14;
  const color = props.color ?? Tailwind_semantic().icon.neutral;
  return (
    <svg
      width={size}
      height={size}
      className={props.className}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.1 5.70455V7.73052M5.6 1H8.6M12.2 7.85714C12.2 10.6975 9.91665 13 7.1 13C4.28335 13 2 10.6975 2 7.85714C2 5.01682 4.28335 2.71429 7.1 2.71429C9.91665 2.71429 12.2 5.01682 12.2 7.85714Z"
        stroke={color}
        stroke-linecap="round"
      />
    </svg>
  );
}
