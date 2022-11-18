import { h, JSX } from "preact";

interface IProps {
  style?: { [key: string]: string | number };
  className?: string;
  color?: string;
}

export function IconArrowDown2(props: IProps): JSX.Element {
  return (
    <svg
      style={props.style}
      className={props.className}
      width="13"
      height="8"
      viewBox="0 0 13 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M11.5 1.5L6.5 6.5L1.5 1.5"
        stroke={props.color || "#818385"}
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
