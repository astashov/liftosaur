import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconUiMode(props: IProps): JSX.Element {
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
        d="M20.25 18.4167C20.25 19.4292 19.4404 20.25 18.4418 20.25L5.55822 20.25C4.55957 20.25 3.75 19.4292 3.75 18.4167L3.75 15.6667C3.75 14.6541 4.55957 13.8333 5.55822 13.8333L18.4418 13.8333C19.4404 13.8333 20.25 14.6541 20.25 15.6667V18.4167Z"
        stroke={color}
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M20.25 5.58333C20.25 4.57081 19.4404 3.75 18.4418 3.75L5.55822 3.75C4.55957 3.75 3.75 4.57081 3.75 5.58333L3.75 8.33333C3.75 9.34585 4.55957 10.1667 5.55822 10.1667H18.4418C19.4404 10.1667 20.25 9.34585 20.25 8.33333V5.58333Z"
        stroke={color}
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
