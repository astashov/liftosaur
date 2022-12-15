import { h, JSX } from "preact";

interface IProps {
  size?: number;
  color?: string;
}

export function IconFilter(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? "#171718";
  return (
    <svg
      width={size}
      className="inline-block"
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="34" cy="9" r="5" stroke={color} stroke-width="2" />
      <circle r="5" transform="matrix(-1 0 0 1 14 24)" stroke={color} stroke-width="2" />
      <circle r="5" transform="matrix(1 0 0 -1 27 39)" stroke={color} stroke-width="2" />
      <path d="M3 9H21" stroke={color} stroke-width="2" stroke-linecap="round" />
      <path d="M3 24L9 24" stroke={color} stroke-width="2" stroke-linecap="round" />
      <path d="M43 39H32" stroke={color} stroke-width="2" stroke-linecap="round" />
      <path d="M3 39L13 39" stroke={color} stroke-width="2" stroke-linecap="round" />
      <path d="M39 9L45 9" stroke={color} stroke-width="2" stroke-linecap="round" />
      <path d="M43 24H27" stroke={color} stroke-width="2" stroke-linecap="round" />
    </svg>
  );
}
