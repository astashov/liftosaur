import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconSwapSmall(props: IProps): JSX.Element {
  const size = props.size ?? 12;
  const color = props.color ?? Tailwind.colors().grayv3.main;
  return (
    <svg
      className={props.className}
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke={color}
    >
      <path
        d="M9.71106 4.00694C9.01609 2.80719 7.71714 2 6.22939 2C4.54256 2 3.09843 3.03768 2.50217 4.50868M8.4903 4.50868H10.5V2.50174M2.78894 8.02083C3.48391 9.22059 4.78286 10.0278 6.27061 10.0278C7.95744 10.0278 9.40157 8.9901 9.99783 7.5191M4.0097 7.5191H2V9.52604"
        stroke-width="1.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
