import { h, JSX } from "preact";

interface IProps {
  color?: string;
  size?: number;
  style?: JSX.CSSProperties;
  className?: string;
}

export function IconPlus(props: IProps): JSX.Element {
  const color = props.color || "#28839F";
  const size = props.size || 18;
  return (
    <svg
      style={props.style}
      className={props.className}
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="9" cy="9" r="9" fill={color} />
      <path d="M13.16 10.312H10.376V13.16H7.784V10.312H5V7.864H7.784V5H10.376V7.864H13.16V10.312Z" fill="white" />
    </svg>
  );
}
