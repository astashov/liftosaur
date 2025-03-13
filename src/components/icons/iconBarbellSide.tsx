import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconBarbellSide(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind.colors().blackv2;
  return (
    <svg
      width={size}
      height={size}
      className={props.className}
      viewBox="0 0 24 24"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8.0513 11.5555H1V13.4444H8.0513V11.5555Z" />
      <path d="M11.6219 4H13.8392V21H11.6219V4Z" />
      <path d="M14.4773 5.75981H16.6945V19.2396H14.4773V5.75981Z" />
      <path d="M17.3325 7.49846H19.5497V17.501H17.3325V7.49846Z" />
      <path d="M20.1382 11.5767V13.4226H23V11.5767H20.1382Z" />
      <path d="M8.76666 4H10.9839V21H8.76666V4Z" />
    </svg>
  );
}
