import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconKeyboardClose(props: IProps): JSX.Element {
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
      <path d="M4 16C3.45 16 2.97917 15.8042 2.5875 15.4125C2.19583 15.0208 2 14.55 2 14V4C2 3.45 2.19583 2.97917 2.5875 2.5875C2.97917 2.19583 3.45 2 4 2H20C20.55 2 21.0208 2.19583 21.4125 2.5875C21.8042 2.97917 22 3.45 22 4V14C22 14.55 21.8042 15.0208 21.4125 15.4125C21.0208 15.8042 20.55 16 20 16H4ZM4 14H20V4H4V14ZM8 13H16V11H8V13ZM5 10H7V8H5V10ZM8 10H10V8H8V10ZM11 10H13V8H11V10ZM14 10H16V8H14V10ZM17 10H19V8H17V10ZM5 7H7V5H5V7ZM8 7H10V5H8V7ZM11 7H13V5H11V7ZM14 7H16V5H14V7ZM17 7H19V5H17V7Z" />
      <path d="M9 18.5L12.5 22L16 18.5H9Z" />
    </svg>
  );
}
