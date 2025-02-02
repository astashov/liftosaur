import { h, JSX } from "preact";

interface IProps {
  color?: string;
  size?: number;
  style?: JSX.CSSProperties;
  className?: string;
}

export function IconPlus2(props: IProps): JSX.Element {
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
      <path
        d="M18 9C18 9.71008 17.4244 10.2857 16.7143 10.2857H10.2857V16.7143C10.2857 17.4244 9.71008 18 9 18C8.28992 18 7.71429 17.4244 7.71429 16.7143V10.2857H1.28571C0.575635 10.2857 0 9.71008 0 9C0 8.28992 0.575634 7.71429 1.28571 7.71429H7.71429V1.28571C7.71429 0.575635 8.28992 0 9 0C9.71008 0 10.2857 0.575634 10.2857 1.28571V7.71429H16.7143C17.4244 7.71429 18 8.28992 18 9Z"
        fill={color}
      />
    </svg>
  );
}
