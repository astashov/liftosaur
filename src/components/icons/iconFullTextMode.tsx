import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconFullTextMode(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind.colors().blackv2;
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
        d="M7.58399 6.4209L12.6413 6.4209M10.9112 9.83058L17.2993 9.83058M10.9112 13.2403L17.2993 13.2403M7.58399 16.6499L12.6413 16.6499"
        stroke={color}
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M4.76498 21.5H4.35795C3.23399 21.5 2.32283 20.5407 2.32283 19.3573V12.5357C2.32283 11.8756 1 11.5715 1 11.5715C1 11.5715 2.32283 11.3173 2.32283 10.6072V4.64273C2.32283 3.45933 3.23399 2.5 4.35795 2.5H4.76498M19.235 2.5H19.642C20.766 2.5 21.6772 3.45933 21.6772 4.64273V11.4643C21.6772 12.1244 23 12.4285 23 12.4285C23 12.4285 21.6772 12.6827 21.6772 13.3928V19.3573C21.6772 20.5407 20.766 21.5 19.642 21.5H19.235"
        stroke={color}
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
