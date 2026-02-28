import { h, JSX } from "preact";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconDayTextMode(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind_semantic().icon.neutral;
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
        d="M4.75253 21.5H4.34685C3.2266 21.5 2.31846 20.5407 2.31846 19.3573V12.5357C2.31845 11.8756 1 11.5715 1 11.5715C1 11.5715 2.31846 11.3173 2.31846 10.6072V4.64273C2.31846 3.45933 3.2266 2.5 4.34685 2.5H4.75253M19.2475 2.5H19.6532C20.7734 2.5 21.6815 3.45933 21.6815 4.64273V11.4643C21.6815 12.1244 23 12.4285 23 12.4285C23 12.4285 21.6815 12.6827 21.6815 13.3928L21.6815 19.3573C21.6815 20.5407 20.7734 21.5 19.6532 21.5H19.2475"
        stroke={color}
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M17.5 17.1723C17.5 17.9885 16.8858 18.6501 16.1282 18.6501L7.87175 18.6501C7.11415 18.6501 6.5 17.9885 6.5 17.1723L6.5 14.9557C6.5 14.1395 7.11415 13.4779 7.87175 13.4779L16.1282 13.4779C16.8858 13.4779 17.5 14.1395 17.5 14.9557V17.1723Z"
        stroke={color}
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M17.5 6.82788C17.5 6.01172 16.8858 5.3501 16.1282 5.3501L7.87175 5.3501C7.11415 5.3501 6.5 6.01172 6.5 6.82788L6.5 9.04454C6.5 9.8607 7.11415 10.5223 7.87175 10.5223H16.1282C16.8858 10.5223 17.5 9.8607 17.5 9.04454V6.82788Z"
        stroke={color}
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
